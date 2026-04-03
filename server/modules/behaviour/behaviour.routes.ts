import type { Express } from "express";
import * as behaviourStorage from "./behaviour.storage";

export function registerBehaviourRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {

  // Get all household stats for the village (pre-computed, fast)
  app.get("/api/behaviour/stats", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const ward = req.query.ward as string | undefined;

      // Ensure all households have a stats row (lazy init)
      await behaviourStorage.ensureAllHouseholdsHaveStats(villageId);

      const stats = await behaviourStorage.getHouseholdStats(villageId, ward || undefined);
      const thresholds = await behaviourStorage.getBehaviourThresholds(villageId);

      res.json({ stats, thresholds });
    } catch (error) {
      res.status(500).json({ message: "Failed to get household stats" });
    }
  });

  // Get thresholds
  app.get("/api/behaviour/thresholds", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const thresholds = await behaviourStorage.getBehaviourThresholds(req.session.villageId!);
      res.json(thresholds);
    } catch (error) {
      res.status(500).json({ message: "Failed to get thresholds" });
    }
  });

  // Update thresholds (manager only)
  app.put("/api/behaviour/thresholds", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const { minAvgRating, maxMixed7Days, maxInactiveDays, minCollections7Days, minCollections30Days } = req.body;
      if (minAvgRating == null || maxMixed7Days == null || maxInactiveDays == null) {
        return res.status(400).json({ message: "All threshold values required" });
      }

      const thresholds = await behaviourStorage.updateBehaviourThresholds(req.session.villageId!, {
        minAvgRating: Number(minAvgRating),
        maxMixed7Days: Number(maxMixed7Days),
        maxInactiveDays: Number(maxInactiveDays),
        minCollections7Days: Number(minCollections7Days || 0),
        minCollections30Days: Number(minCollections30Days || 0),
      });

      res.json(thresholds);
    } catch (error) {
      res.status(500).json({ message: "Failed to update thresholds" });
    }
  });
}
