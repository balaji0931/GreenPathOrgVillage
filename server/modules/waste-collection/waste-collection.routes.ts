import type { Express } from "express";
import { storage } from "../../storage";
import { submitCollection } from "./waste-collection.service";

export function registerWasteCollectionRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Waste collection routes
  app.post('/api/waste-collections', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
    try {
      const {
        householdUid,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate
      } = req.body;

      const result = await submitCollection({
        householdUid,
        collectorUserId: req.session.userId!,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate,
      });

      if (result.conflict) {
        return res.status(409).json({
          message: result.message,
          existingCollection: result.existingCollection
        });
      }

      res.json(result.collection);
    } catch (error: any) {
      console.error("Create waste collection error:", error);
      if (error.message === "Household not found" || error.message === "Collector not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "VILLAGE_MISMATCH") {
        return res.status(403).json({ message: "Village mismatch" });
      }
      res.status(500).json({ message: "Failed to create waste collection" });
    }
  });

  app.get('/api/waste-collections/household/:uid', requireAuth, async (req, res) => {
    try {
      const { uid } = req.params;
      const household = await storage.getHouseholdByUid(uid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await storage.getCollectionsByHousehold(household.id, { limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Get household collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // Get collections for generator's household
  app.get('/api/waste-collections/household', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const generatorUserId = req.session.userId!;
      const household = await storage.getHouseholdByGeneratorUserId(generatorUserId);

      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      const result = await storage.getCollectionsByHousehold(household.id, { limit: 50 });
      res.json(result);
    } catch (error) {
      console.error("Get generator household collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // Get household data for logged-in generator
  app.get('/api/generator/household', async (req, res) => {
    try {
      // Simple auth check
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Please log in" });
      }

      const userId = req.session.userId;
      console.log('Generator household request for:', userId);

      // Get user to verify they're a generator
      const user = await storage.getUserByUserId(userId);
      if (!user || user.role !== 'generator') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Find household by generator user ID
      const household = await storage.getHouseholdByGeneratorUserId(userId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      console.log('Found household:', household.uid, 'QR Code:', !!household.qrCodeUrl);
      res.json(household);
    } catch (error) {
      console.error('Get generator household error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get('/api/waste-collections/collector', requireAuth, requireRole(['collector']), async (req, res) => {
    try {
      const collectorUid = req.session.userId!;
      const collector = await storage.getCollectorByUid(collectorUid);

      if (!collector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      const collections = await storage.getCollectionsByCollector(collector.id);
      res.json(collections);
    } catch (error) {
      console.error("Get collector collections error:", error);
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // New API routes for manager real-time management
  app.get('/api/waste-collections/village', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { date, householdId } = req.query;

      const collections = await storage.getCollectionsByVillageWithDetails(
        villageId,
        date as string,
        householdId ? parseInt(householdId as string) : undefined
      );

      res.json(collections);
    } catch (error) {
      console.error("Get village collections error:", error);
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.get('/api/waste-collections/village/paginated', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5000;
      const date = req.query.date as string;
      const collectorId = req.query.collectorId ? parseInt(req.query.collectorId as string) : undefined;
      const status = req.query.status as string;

      const result = await storage.getCollectionsByVillageWithDetailsPaginated(villageId, {
        page,
        limit,
        date,
        collectorId,
        status
      });

      res.json(result);
    } catch (error) {
      console.error("Get paginated village collections error:", error);
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.get('/api/collections/daily-summary', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const date = req.query.date as string || new Date().toISOString().split('T0')[0];

      const summary = await storage.getDailyCollectionSummary(villageId, date);
      res.json(summary);
    } catch (error) {
      console.error("Get daily collection summary error:", error);
      res.status(500).json({ message: "Failed to get daily collection summary" });
    }
  });
}
