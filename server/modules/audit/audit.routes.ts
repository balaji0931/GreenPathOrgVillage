import type { Express } from "express";
import { getAuditLogs, getAuditLogsForVillages } from "./audit.storage";

export function registerAuditRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Manager: view audit logs for their village
  app.get('/api/audit-logs', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const entity = req.query.entity as string;
      const action = req.query.action as string;

      const result = await getAuditLogs({
        villageId,
        entity,
        action,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin: view audit logs across all villages
  app.get('/api/admin/audit-logs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const villageId = req.query.villageId as string;
      const entity = req.query.entity as string;
      const action = req.query.action as string;
      const userId = req.query.userId as string;

      const result = await getAuditLogs({
        villageId,
        entity,
        action,
        userId,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Moderator: view audit logs for their assigned villages only
  app.get('/api/moderator/audit-logs', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      // Get moderator's assigned villages from storage
      const { storage } = await import("../../storage");
      const villages = await storage.getModeratorVillages(req.session.userId!);
      const villageIds = villages.map((v: any) => v.villageId);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const entity = req.query.entity as string;
      const action = req.query.action as string;

      const result = await getAuditLogsForVillages({
        villageIds,
        entity,
        action,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });
}
