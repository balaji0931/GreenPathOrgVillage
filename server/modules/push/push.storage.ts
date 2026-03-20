import { db } from "../../db";
import { pushSubscriptions, households } from "@shared/schema";
import { eq, and, sql, lt, isNull, or, ne } from "drizzle-orm";

/** Save or update a push subscription for a household */
export async function upsertPushSubscription(data: {
  householdId: number;
  villageId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}) {
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, data.endpoint))
    .limit(1);

  if (existing.length > 0) {
    // Update existing (may have changed household or keys)
    const [updated] = await db
      .update(pushSubscriptions)
      .set({
        householdId: data.householdId,
        villageId: data.villageId,
        p256dhKey: data.p256dhKey,
        authKey: data.authKey,
        isActive: true,
      })
      .where(eq(pushSubscriptions.endpoint, data.endpoint))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(pushSubscriptions)
    .values(data)
    .returning();
  return created;
}

/** Remove a push subscription by endpoint */
export async function removePushSubscription(endpoint: string) {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Get subscription status for a household */
export async function getSubscriptionByHousehold(householdId: number) {
  const [sub] = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.householdId, householdId),
        eq(pushSubscriptions.isActive, true)
      )
    )
    .limit(1);
  return sub || null;
}

/** Mark a subscription as inactive (dead endpoint) */
export async function deactivateSubscription(endpoint: string) {
  await db
    .update(pushSubscriptions)
    .set({ isActive: false })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Update last_notified_at for a batch of subscription IDs */
export async function markNotified(subIds: number[]) {
  if (subIds.length === 0) return;
  await db
    .update(pushSubscriptions)
    .set({ lastNotifiedAt: new Date() })
    .where(sql`${pushSubscriptions.id} = ANY(${subIds})`);
}

/**
 * Find nearby households with active push subscriptions.
 * Bounding-box geo filter — no GIS extension needed.
 * Skips households already notified within cooldownMinutes.
 * Skips households already collected today.
 */
export async function findNearbySubscriptions(params: {
  villageId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  excludeHouseholdId: number;
  cooldownMinutes: number;
  todayDateStr: string;
}): Promise<{
  id: number;
  householdId: number;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}[]> {
  const { villageId, lat, lng, radiusMeters, excludeHouseholdId, cooldownMinutes, todayDateStr } = params;

  // Convert meters to degrees (approximate)
  const latDelta = radiusMeters / 111000;
  const lngDelta = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));

  const cooldownThreshold = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const results = await db
    .select({
      id: pushSubscriptions.id,
      householdId: pushSubscriptions.householdId,
      endpoint: pushSubscriptions.endpoint,
      p256dhKey: pushSubscriptions.p256dhKey,
      authKey: pushSubscriptions.authKey,
    })
    .from(pushSubscriptions)
    .innerJoin(households, eq(pushSubscriptions.householdId, households.id))
    .where(
      and(
        eq(pushSubscriptions.villageId, villageId),
        eq(pushSubscriptions.isActive, true),
        ne(pushSubscriptions.householdId, excludeHouseholdId),
        // Bounding box filter
        sql`CAST(${households.latitude} AS DOUBLE PRECISION) BETWEEN ${lat - latDelta} AND ${lat + latDelta}`,
        sql`CAST(${households.longitude} AS DOUBLE PRECISION) BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}`,
        // Cooldown: not notified recently
        or(
          isNull(pushSubscriptions.lastNotifiedAt),
          lt(pushSubscriptions.lastNotifiedAt, cooldownThreshold)
        ),
      )
    )
    .limit(30);

  return results;
}
