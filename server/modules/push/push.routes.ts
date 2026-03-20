import type { Express } from "express";
import { storage } from "../../storage";
import { getVapidPublicKey } from "./push.service";
import * as pushStorage from "./push.storage";

export function registerPushRoutes(
  app: Express,
  requireAuth: any,
  requireRole: any
) {
  // GET /api/push/vapid-key — returns VAPID public key (no auth required)
  app.get("/api/push/vapid-key", (_req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(503).json({ message: "Push notifications not configured" });
    }
    res.json({ vapidPublicKey: key });
  });

  // POST /api/push/subscribe — save push subscription (generator only)
  app.post(
    "/api/push/subscribe",
    requireAuth,
    requireRole(["generator"]),
    async (req, res) => {
      try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
          return res.status(400).json({ message: "Missing subscription data" });
        }

        // Find the household linked to this generator
        const household = await storage.getHouseholdByGeneratorUserId(
          req.session.userId!
        );
        if (!household) {
          return res.status(404).json({ message: "Household not found" });
        }

        const sub = await pushStorage.upsertPushSubscription({
          householdId: household.id,
          villageId: household.villageId,
          endpoint,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
        });

        res.json({ success: true, id: sub.id });
      } catch (error) {
        console.error("[Push] Subscribe error:", error);
        res.status(500).json({ message: "Failed to save subscription" });
      }
    }
  );

  // DELETE /api/push/subscribe — remove push subscription (generator only)
  app.delete(
    "/api/push/subscribe",
    requireAuth,
    requireRole(["generator"]),
    async (req, res) => {
      try {
        const { endpoint } = req.body;
        if (!endpoint) {
          return res.status(400).json({ message: "Missing endpoint" });
        }

        await pushStorage.removePushSubscription(endpoint);
        res.json({ success: true });
      } catch (error) {
        console.error("[Push] Unsubscribe error:", error);
        res.status(500).json({ message: "Failed to remove subscription" });
      }
    }
  );

  // GET /api/push/status — check subscription status (generator only)
  app.get(
    "/api/push/status",
    requireAuth,
    requireRole(["generator"]),
    async (req, res) => {
      try {
        const household = await storage.getHouseholdByGeneratorUserId(
          req.session.userId!
        );
        if (!household) {
          return res.json({ subscribed: false });
        }

        const sub = await pushStorage.getSubscriptionByHousehold(household.id);
        res.json({ subscribed: !!sub });
      } catch (error) {
        console.error("[Push] Status error:", error);
        res.status(500).json({ message: "Failed to check status" });
      }
    }
  );
}
