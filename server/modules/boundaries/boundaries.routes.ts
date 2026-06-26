import type { Express } from "express";
import { getVillageBoundaries, upsertVillageBoundary, deleteVillageBoundary } from "./boundaries.storage";
import { db } from "../../db";
import { households, villages } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCache } from "../../cache";
import { validateCoordinates, polygonAreaSqMeters, polygonSelfIntersects, polygonsOverlap } from "../../utils/geo";

export function registerBoundariesRoutes(
  app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any
) {
  // GET all boundaries
  app.get("/api/village-boundaries", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      res.json(await getVillageBoundaries(req.session.villageId!));
    } catch (error) {
      console.error("[Boundaries] GET error:", error);
      res.status(500).json({ message: "Failed to get boundaries" });
    }
  });

  // POST — create/update boundary
  app.post("/api/village-boundaries", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { type, wardName, coordinates } = req.body;

      // Type validation
      if (!type || !['village', 'ward'].includes(type)) {
        return res.status(400).json({ message: "Type must be 'village' or 'ward'" });
      }
      // Strict coordinate validation (#4)
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
        return res.status(400).json({ message: "At least 3 coordinate points required" });
      }
      if (!validateCoordinates(coordinates)) {
        return res.status(400).json({ message: "Invalid coordinates: each point must be [lat, lng] with valid ranges" });
      }
      // Self-intersection check (#17)
      if (polygonSelfIntersects(coordinates)) {
        return res.status(400).json({ message: "Polygon is self-intersecting" });
      }

      // Ward existence validation (#6) — check against village.wards array
      if (type === 'ward') {
        if (!wardName || typeof wardName !== 'string') {
          return res.status(400).json({ message: "wardName required for ward boundaries" });
        }
        const [village] = await db.select({ wards: villages.wards })
          .from(villages).where(eq(villages.villageId, villageId)).limit(1);
        if (!village || !village.wards || !village.wards.includes(wardName)) {
          return res.status(400).json({ message: "Ward not found in this village" });
        }
      }

      // Server-side overlap validation (#5)
      if (type === 'ward') {
        const existing = await getVillageBoundaries(villageId);
        for (const other of existing.filter(b => b.type === 'ward' && b.wardName !== wardName)) {
          if (polygonsOverlap(coordinates, other.coordinates as [number, number][])) {
            return res.status(400).json({ message: `Overlaps with ward boundary: ${other.wardName}` });
          }
        }
      }

      // Server-computed area (#16)
      const areaSqMeters = polygonAreaSqMeters(coordinates);

      const boundary = await upsertVillageBoundary({
        villageId, type, wardName: type === 'ward' ? wardName : null, coordinates, areaSqMeters,
      });
      res.status(201).json(boundary);
    } catch (error) {
      console.error("[Boundaries] POST error:", error);
      res.status(500).json({ message: "Failed to save boundary" });
    }
  });

  // DELETE boundary
  app.delete("/api/village-boundaries/:id", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid boundary id" });
      const deleted = await deleteVillageBoundary(id, req.session.villageId!);
      if (!deleted) return res.status(404).json({ message: "Boundary not found" });
      res.json({ message: "Boundary deleted" });
    } catch (error) {
      console.error("[Boundaries] DELETE error:", error);
      res.status(500).json({ message: "Failed to delete boundary" });
    }
  });

  // POST — bulk reassign household wards (uses ward text names)
  app.post("/api/households/reassign-wards", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const { assignments } = req.body;

      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ message: "Assignments array required" });
      }
      if (assignments.length > 1000) {
        return res.status(400).json({ message: "Maximum 1000 reassignments per request" });
      }
      // Validate format: householdId (number) + newWard (string)
      const valid = assignments.every(
        (a: any) => typeof a.householdId === 'number' && typeof a.newWard === 'string' && a.newWard.trim().length > 0
      );
      if (!valid) {
        return res.status(400).json({ message: "Each assignment needs householdId (number) and newWard (string)" });
      }

      // Validate target wards exist in this village (#14)
      const [village] = await db.select({ wards: villages.wards })
        .from(villages).where(eq(villages.villageId, villageId)).limit(1);
      const validWardSet = new Set(village?.wards || []);
      const targetWards = [...new Set(assignments.map((a: any) => a.newWard as string))];
      const invalidWards = targetWards.filter(w => !validWardSet.has(w));
      if (invalidWards.length > 0) {
        return res.status(400).json({ message: `Invalid wards: ${invalidWards.join(', ')}` });
      }

      // Tenant isolation (#1) — verify households belong to this village
      const householdIds = assignments.map((a: any) => a.householdId as number);
      const validHouseholds = await db.select({ id: households.id })
        .from(households)
        .where(and(inArray(households.id, householdIds), eq(households.villageId, villageId)));
      const validHhSet = new Set(validHouseholds.map(h => h.id));

      let updated = 0;
      await db.transaction(async (tx) => {
        for (const { householdId, newWard } of assignments) {
          if (!validHhSet.has(householdId)) continue;
          const result = await tx.update(households)
            .set({ ward: newWard })
            .where(and(eq(households.id, householdId), eq(households.villageId, villageId)))
            .returning({ id: households.id });
          if (result.length > 0) updated++;
        }
      });

      const cache = getCache();
      await cache.delete(`households:${villageId}`);
      await cache.delete(`village-stats:${villageId}`);
      res.json({ message: `${updated} households reassigned`, updated });
    } catch (error) {
      console.error("[Households] Reassign error:", error);
      res.status(500).json({ message: "Failed to reassign wards" });
    }
  });
}
