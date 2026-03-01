import type { Express } from "express";
import { storage } from "../../storage";

export function registerModeratorAnalyticsRoutes(app: Express, requireAuth: any, requireRole: any) {
    // Get moderator stats (only for assigned villages)
    app.get('/api/moderator/stats', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            const villageIds = villages.map(v => v.villageId);

            const stats = await storage.getModeratorStats(villageIds);
            res.json(stats);
        } catch (error) {
            console.error('Get moderator stats error:', error);
            res.status(500).json({ message: "Failed to get stats" });
        }
    });

    // Get reports for moderator villages only
    app.get('/api/moderator/reports', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            const villageIds = villages.map(v => v.villageId);

            const { startDate, endDate } = req.query;

            const reports = await storage.getModeratorReports(villageIds, {
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
            });

            res.json(reports);
        } catch (error) {
            console.error('Get moderator reports error:', error);
            res.status(500).json({ message: "Failed to get reports" });
        }
    });

    app.get('/api/moderator/analytics/system', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const { village } = req.query;

            // Get villages assigned to this moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const villageIds = assignedVillages.map(v => v.villageId);

            if (villageIds.length === 0) {
                return res.json({
                    totalCollections: 0,
                    avgRating: 0,
                    villageStats: [],
                    totalCollectionsThisWeek: 0,
                    averageSegregationRating: 0,
                    topPerformingVillages: [],
                    collectionTrends: [],
                    segregationRateDistribution: [],
                    totalVillages: 0,
                    totalHouseholds: 0,
                    totalCollectors: 0,
                    totalCollectionsToday: 0
                });
            }

            // Get comprehensive analytics for moderator villages with village filter
            const selectedVillageId = village === 'all' ? undefined : village as string;
            const analytics = await storage.getModeratorSystemAnalytics(villageIds, selectedVillageId);

            // Return the full analytics object directly as it contains all needed data
            const fullAnalytics = {
                ...analytics,
                // Ensure all required fields are present
                totalCollectionsThisWeek: analytics.totalCollectionsThisWeek,
                averageSegregationRating: analytics.averageSegregationRating,
                topPerformingVillages: analytics.topPerformingVillages,
                collectionTrends: analytics.collectionTrends,
                segregationRateDistribution: analytics.segregationRateDistribution
            };

            res.json(fullAnalytics);
        } catch (error) {
            console.error("Get moderator system analytics error:", error);
            res.status(500).json({ message: "Failed to get moderator system analytics" });
        }
    });

    app.get('/api/moderator/analytics/daily', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const { date } = req.query;

            // Get villages assigned to this moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const villageIds = assignedVillages.map(v => v.villageId);

            if (villageIds.length === 0) {
                return res.json({ totalHouses: 0, collected: 0, remaining: 0, avgSegregationRating: 0 });
            }

            const dailyData = await storage.getModeratorDailyReportData(villageIds, date as string);
            res.json(dailyData);
        } catch (error) {
            console.error("Get moderator daily analytics error:", error);
            res.status(500).json({ message: "Failed to get moderator daily analytics" });
        }
    });
}
