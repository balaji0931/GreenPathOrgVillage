import type { Express } from "express";
import { storage } from "../../storage";
import {
  createCollectorWithAccount,
  getCollectorStatsForVillage,
} from "./collector.service";

export function registerCollectorRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Collector routes
  app.post('/api/collectors', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { name, phone } = req.body;
      const villageId = req.session.villageId!;

      const collector = await createCollectorWithAccount({ name, phone, villageId });

      res.json(collector);
    } catch (error) {
      console.error("Create collector error:", error);
      res.status(500).json({ message: "Failed to create collector" });
    }
  });

  app.get('/api/collectors', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const collectors = await storage.getCollectorsByVillage(villageId);
      res.json(collectors);
    } catch (error) {
      console.error("Get collectors error:", error);
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Paginated collectors endpoint
  app.get('/api/collectors/paginated', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const villageId = req.session.villageId || req.query.villageId as string;
      if (!villageId) {
        return res.status(400).json({ message: "Village ID required" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const search = req.query.search as string;

      const result = await storage.getCollectorsByVillagePaginated(villageId, { page, limit, search });
      res.json(result);
    } catch (error) {
      console.error("Get paginated collectors error:", error);
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Enhanced collector management routes
  app.get('/api/collectors/stats/:villageId', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;

      const collectorStats = await getCollectorStatsForVillage(villageId);

      res.json(collectorStats);
    } catch (error) {
      console.error("Get collector stats error:", error);
      res.status(500).json({ message: "Failed to get collector stats" });
    }
  });
}
