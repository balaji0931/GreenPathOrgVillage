import type { Express } from "express";
import { storage } from "../../storage";
import {
  createCollectorWithAccount,
  getCollectorStatsForVillage,
} from "./collector.service";
import { logAction } from "../audit/audit.storage";

export function registerCollectorRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Collector routes
  app.post('/api/collectors', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { name, phone } = req.body;
      const villageId = req.session.villageId!;

      const collector = await createCollectorWithAccount({ name, phone, villageId });

      logAction(villageId, req.session.userId!, 'created', 'collector', collector.uid, {
        name,
      });

      res.json(collector);
    } catch (error) {
      res.status(500).json({ message: "Failed to create collector" });
    }
  });

  app.get('/api/collectors', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const collectors = await storage.getCollectorsByVillage(villageId);
      res.json(collectors);
    } catch (error) {
      res.status(500).json({ message: "Failed to get collectors" });
    }
  });

  // Paginated collectors endpoint
  app.get('/api/collectors/paginated', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
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
      res.status(500).json({ message: "Failed to get collector stats" });
    }
  });
}
