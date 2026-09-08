import type { Express } from "express";
import { format } from "date-fns";
import { storage } from "../../storage";
import { db } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import { wasteCollections, households } from "@shared/schema";
import {
  createCollectorWithAccount,
  getCollectorStatsForVillage,
} from "./collector.service";
import * as collectorStorage from "./collector.storage";
import * as villageStorage from "../village/village.storage";
import { deriveVehicleSessions } from "../analytics/daily-stats.storage";
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

  /**
   * GET /api/collector/vehicle-report?date=YYYY-MM-DD
   *
   * Returns the collector's own assigned vehicle's:
   * - Session report (work/break breakdown)
   * - Hourly collection timeline
   *
   * Reuses the same deriveVehicleSessions algorithm as the manager report.
   */
  app.get('/api/collector/vehicle-report', requireAuth, requireRole(['collector']), async (req, res) => {
    try {
      const collectorUid = req.session?.userId || (req as any).user?.userId;
      if (!collectorUid) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const collector = await collectorStorage.getCollectorByUid(collectorUid);
      if (!collector) {
        return res.status(404).json({ message: "Collector not found" });
      }

      if (!collector.assignedVehicle) {
        return res.json({
          vehicleName: null,
          registrationNumber: null,
          collectorNames: collector.name,
          count: 0,
          startTime: null,
          endTime: null,
          sessions: [],
          totalWorkMs: 0,
          totalBreakMs: 0,
          hourlyTimeline: [],
        });
      }

      const villageId = collector.villageId;
      const dateParam = (req.query.date as string) || format(new Date(), 'yyyy-MM-dd');
      const targetDate = new Date(dateParam + 'T00:00:00');

      // Get village for vehicle name mapping
      const village = await villageStorage.getVillageByVillageId(villageId);
      const vehiclesList = (village?.vehicles as any[]) || [];
      const vehicleEntry = vehiclesList.find((v: any) => v.registrationNumber === collector.assignedVehicle);
      const vehicleName = vehicleEntry?.name || collector.assignedVehicle;

      // Get all collectors assigned to this vehicle
      const allCollectors = await storage.getCollectorsByVillage(villageId);
      const vehicleCollectors = allCollectors.filter((c: any) => c.assignedVehicle === collector.assignedVehicle);
      const collectorNames = vehicleCollectors.map((c: any) => c.name).join(', ');
      const collectorIds = vehicleCollectors.map((c: any) => c.id);

      // IST day boundaries (same as premium report)
      const istStartOffset = 5.5 * 60 * 60 * 1000;
      const startOfIstDayUTC = new Date(targetDate.getTime() - istStartOffset);
      const endOfIstDayUTC = new Date(startOfIstDayUTC.getTime() + 86400000);

      // Query collection timestamps for this vehicle's collectors
      const collectionRows = await db.select({
        collectionDate: wasteCollections.collectionDate,
      })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(and(
          eq(households.villageId, villageId),
          sql`${wasteCollections.collectorId} IN (${sql.raw(collectorIds.join(',') || '0')})`,
          sql`${wasteCollections.collectionDate} >= ${startOfIstDayUTC.toISOString()}`,
          sql`${wasteCollections.collectionDate} < ${endOfIstDayUTC.toISOString()}`
        ))
        .orderBy(wasteCollections.collectionDate);

      // Derive sessions
      const timestamps = collectionRows.map(r => new Date(r.collectionDate as Date));
      const sessionResult = deriveVehicleSessions(timestamps);

      // First and last collection times
      const startTime = timestamps.length > 0 ? timestamps[0].toISOString() : null;
      const endTime = timestamps.length > 0 ? timestamps[timestamps.length - 1].toISOString() : null;

      // Hourly timeline (5 AM to 6 PM)
      const hourlyTimeline: { hour: string; collections: number }[] = [];
      for (let h = 5; h <= 18; h++) {
        const count = timestamps.filter(t => {
          // Convert to IST hour
          const istHour = (t.getUTCHours() + 5 + Math.floor((t.getUTCMinutes() + 30) / 60)) % 24;
          return istHour === h;
        }).length;
        hourlyTimeline.push({
          hour: `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`,
          collections: count,
        });
      }

      res.json({
        vehicleName,
        registrationNumber: collector.assignedVehicle,
        collectorNames,
        count: timestamps.length,
        startTime,
        endTime,
        sessions: sessionResult.sessions,
        totalWorkMs: sessionResult.totalWorkMs,
        totalBreakMs: sessionResult.totalBreakMs,
        hourlyTimeline,
      });
    } catch (error) {
      console.error("[Collector] Vehicle report error:", error);
      res.status(500).json({ message: "Failed to get vehicle report" });
    }
  });
}
