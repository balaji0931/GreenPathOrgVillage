import type { Express } from "express";
import { storage } from "../storage";
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

  // Stats routes
  app.get('/api/stats/admin', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  app.get('/api/stats/moderator', requireAuth, requireRole(['moderator']), async (req, res) => {
    try {
      const moderatorId = req.session.userId!;
      const villages = await storage.getModeratorVillages(moderatorId);

      let totalHouseholds = 0;
      let totalCollectors = 0;
      let totalOpenIssues = 0;
      let totalCollectionsToday = 0;

      for (const village of villages) {
        const stats = await storage.getVillageStats(village.villageId);
        totalHouseholds += stats.totalHouseholds;
        totalCollectors += stats.totalCollectors;
        totalOpenIssues += stats.openIssues;
        totalCollectionsToday += stats.collectionsToday;
      }

      res.json({
        totalVillages: villages.length,
        totalHouseholds,
        totalCollectors,
        totalOpenIssues,
        totalCollectionsToday,
        assignedVillages: villages,
      });
    } catch (error) {
      console.error("Get moderator stats error:", error);
      res.status(500).json({ message: "Failed to get moderator stats" });
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

  app.get('/api/reports', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village, role, startDate, endDate } = req.query;
      const reportData = await storage.generateReport({
        village: village === 'all' ? undefined : village as string,
        role: role === 'all' ? undefined : role as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(reportData);
    } catch (error) {
      console.error("Generate report error:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get('/api/analytics/system', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village } = req.query;
      const analytics = await storage.getSystemAnalytics(village as string);
      res.json(analytics);
    } catch (error) {
      console.error("Get system analytics error:", error);
      res.status(500).json({ message: "Failed to get system analytics" });
    }
  });

  app.get('/api/analytics/daily', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { village, date } = req.query;
      const dailyData = await storage.getDailyReportData(
        village as string,
        date as string
      );
      res.json(dailyData);
    } catch (error) {
      console.error("Get daily analytics error:", error);
      res.status(500).json({ message: "Failed to get daily analytics" });
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
