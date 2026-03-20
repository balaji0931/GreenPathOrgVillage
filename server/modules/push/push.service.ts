import webpush from "web-push";
import { storage } from "../../storage";
import { findNearbySubscriptions, markNotified, deactivateSubscription } from "./push.storage";

// Initialize VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@greenpathorg.social";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// In-memory collector movement cache — prevents notification storms
// Key: collectorId, Value: { lat, lng, timestamp }
const collectorAlertCache = new Map<string, { lat: number; lng: number; at: number }>();

// Movement cluster threshold: only send if moved > 80m or > 5 min since last alert
const CLUSTER_DISTANCE_M = 80;
const CLUSTER_TIME_MS = 5 * 60 * 1000;

// Delay before sending (ensures vehicle is actually in the area)
const SEND_DELAY_MS = 25 * 1000;

// Push batch size (to avoid event loop saturation on free tier)
const BATCH_SIZE = 8;

/**
 * Calculate distance between two lat/lng points in meters (Haversine).
 * Used only for the movement-cluster check (~0.001ms).
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if current IST time is within the village notification window.
 */
function isWithinNotificationWindow(windowStart: string, windowEnd: string): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const hh = istNow.getUTCHours();
  const mm = istNow.getUTCMinutes();
  const currentMinutes = hh * 60 + mm;

  const [startH, startM] = windowStart.split(":").map(Number);
  const [endH, endM] = windowEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Main entry point: called after each collection is saved.
 * Decides whether to send proximity alerts based on movement-cluster logic.
 * Completely async / fire-and-forget — does NOT block the collection response.
 */
export async function triggerProximityAlert(params: {
  collectorId: string;
  villageId: string;
  householdId: number;
  lat: number;
  lng: number;
  todayDateStr: string;
}) {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

    const { collectorId, villageId, householdId, lat, lng, todayDateStr } = params;

    // Check village settings
    const village = await storage.getVillageByVillageId(villageId);
    if (!village) return;
    if (!(village as any).proximityAlertsEnabled) return;

    const radiusMeters = (village as any).notificationRadiusMeters || 150;
    const windowStart = (village as any).notificationWindowStart || "05:30";
    const windowEnd = (village as any).notificationWindowEnd || "13:00";

    // Time window guard
    if (!isWithinNotificationWindow(windowStart, windowEnd)) return;

    // Movement cluster check: skip if collector hasn't moved enough since last alert
    const lastAlert = collectorAlertCache.get(collectorId);
    if (lastAlert) {
      const distanceMoved = haversineMeters(lastAlert.lat, lastAlert.lng, lat, lng);
      const timeSince = Date.now() - lastAlert.at;

      if (distanceMoved < CLUSTER_DISTANCE_M && timeSince < CLUSTER_TIME_MS) {
        // Same cluster — skip to avoid notification spam
        return;
      }
    }

    // Update cluster cache BEFORE the delay
    collectorAlertCache.set(collectorId, { lat, lng, at: Date.now() });

    // Delay sending by 25 seconds to ensure vehicle is actually in the area
    setTimeout(() => {
      sendNearbyAlerts({
        villageId,
        householdId,
        lat,
        lng,
        radiusMeters,
        todayDateStr,
      }).catch((err) => {
        console.error("[PushAlert] Send failed:", err.message);
      });
    }, SEND_DELAY_MS);
  } catch (err) {
    // Completely non-blocking — log and continue
    console.error("[PushAlert] Trigger failed:", (err as Error).message);
  }
}

/**
 * Find and notify nearby households.
 */
async function sendNearbyAlerts(params: {
  villageId: string;
  householdId: number;
  lat: number;
  lng: number;
  radiusMeters: number;
  todayDateStr: string;
}) {
  const subs = await findNearbySubscriptions({
    villageId: params.villageId,
    lat: params.lat,
    lng: params.lng,
    radiusMeters: params.radiusMeters,
    excludeHouseholdId: params.householdId,
    cooldownMinutes: 20,
    todayDateStr: params.todayDateStr,
  });

  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: "🚛 Waste vehicle is nearby",
    body: "The collection vehicle has reached your street. Please keep your segregated waste ready for handover.",
    tag: "vehicle-nearby",
    icon: "/logos/png/logo-192x192.png",
    badge: "/logos/png/logo-64x64.png",
  });

  const notifiedIds: number[] = [];

  // Send in batches of BATCH_SIZE to avoid event-loop saturation
  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const batch = subs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
          },
          payload,
          { TTL: 300 } // 5 min TTL — notification expires if device is offline
        )
      )
    );

    // Handle results: track successes, clean up dead subscriptions
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        notifiedIds.push(batch[idx].id);
      } else {
        const statusCode = (result.reason as any)?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Dead subscription — auto-cleanup
          deactivateSubscription(batch[idx].endpoint).catch(() => { });
        }
      }
    });
  }

  // Mark notified subscriptions with timestamp
  if (notifiedIds.length > 0) {
    await markNotified(notifiedIds);
  }
}

/** Expose VAPID public key for client */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
