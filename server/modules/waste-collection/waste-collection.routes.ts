import type { Express } from "express";
import { storage } from "../../storage";
import { submitCollection } from "./waste-collection.service";
import { db } from "../../db";
import { wasteCollections, households } from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";

export function registerWasteCollectionRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Waste collection routes
  app.post('/api/waste-collections', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
    try {
      const {
        householdUid,
        segregationRating,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate,
        wasteTypes,
        weightKg,
        latitude,
        longitude
      } = req.body;

      const result = await submitCollection({
        householdUid,
        collectorUserId: req.session.userId!,
        segregationRating,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate,
        wasteTypes,
        weightKg,
        latitude,
        longitude,
      });

      if (result.conflict) {
        return res.status(409).json({
          message: result.message,
          existingCollection: result.existingCollection
        });
      }

      res.json(result.collection);
    } catch (error: any) {
      if (error.message === "Household not found" || error.message === "Collector not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "VILLAGE_MISMATCH") {
        return res.status(403).json({ message: "Village mismatch" });
      }
      res.status(500).json({ message: "Failed to create waste collection" });
    }
  });

  app.get('/api/waste-collections/household/:uid', requireAuth, requireRole(['manager', 'collector']), async (req, res) => {
    try {
      const { uid } = req.params;
      const household = await storage.getHouseholdByUid(uid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      // Verify household belongs to user's village
      const userVillageId = req.session.villageId;
      if (userVillageId && household.villageId !== userVillageId) {
        return res.status(404).json({ message: "Household not found" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await storage.getCollectionsByHousehold(household.id, { limit, offset });
      res.json(result);
    } catch (error) {
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

      const result = await storage.getCollectionsByHousehold(household.id, { limit: 1000 });
      // result is { data: [...], stats: {...} } — extract the data array
      const collections = Array.isArray(result.data) ? result.data : [];
      // Strip internal IDs from collection data for generators
      const sanitized = collections.map(({ collectorId, ...rest }: any) => rest);
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ message: "Failed to get collections" });
    }
  });

  // Get household data for logged-in generator
  app.get('/api/generator/household', requireAuth, requireRole(['generator']), async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Find household by generator user ID
      const household = await storage.getHouseholdByGeneratorUserId(userId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }

      // Strip sensitive/internal fields — generator sees own info but not credentials or internal IDs
      const { generatorPassword, generatorUserId, ...safeHousehold } = household as any;
      res.json(safeHousehold);
    } catch (error) {
      res.status(500).json({ message: "Failed to load household data" });
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
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.get('/api/waste-collections/village/paginated', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
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
      res.status(500).json({ message: "Failed to get village collections" });
    }
  });

  app.get('/api/collections/daily-summary', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const date = req.query.date as string || new Date().toISOString().split('T')[0];

      const summary = await storage.getDailyCollectionSummary(villageId, date);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily collection summary" });
    }
  });

  // Lightweight village-wide today count for collectors
  app.get('/api/village/today-count', requireAuth, requireRole(['collector', 'manager']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const [year, month, day] = todayStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      const [result] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            eq(households.villageId, villageId),
            sql`${wasteCollections.collectionDate} >= ${startDate}`,
            sql`${wasteCollections.collectionDate} <= ${endDate}`
          )
        );

      res.json({ collectedToday: result?.count || 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to get today count" });
    }
  });
}
