import type { Express } from "express";
import { storage } from "../../storage";
import { format } from "date-fns";

export function registerStatsRoutes(app: Express, requireAuth: any, requireRole: any) {
  app.get('/api/manager/stats', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const stats = await storage.getVillageStats(villageId);
      res.json(stats);
    } catch (error) {
      console.error("Get manager stats error:", error);
      res.status(500).json({ message: "Failed to get village stats" });
    }
  });

  app.get('/api/stats/village', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const stats = await storage.getVillageStats(villageId);
      res.json(stats);
    } catch (error) {
      console.error("Get village stats error:", error);
      res.status(500).json({ message: "Failed to get village stats" });
    }
  });

  app.get('/api/analytics/premium', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const villageId = (req.query.village as string) || req.session.villageId;
      const date = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');

      if (!villageId) {
        return res.status(400).json({ message: "Village ID is required" });
      }

      const data = await storage.getPremiumReportData(villageId, date);
      res.json(data);
    } catch (error) {
      console.error("Get premium analytics error:", error);
      res.status(500).json({ message: "Failed to get premium report data" });
    }
  });
}
