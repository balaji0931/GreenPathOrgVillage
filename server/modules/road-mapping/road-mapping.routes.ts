import type { Express } from "express";
import {
  getVillageRoads,
  createVillageRoad,
  updateVillageRoad,
  deleteVillageRoad,
} from "./road-mapping.storage";
import { validateCoordinates } from "../../utils/geo";

export function registerRoadMappingRoutes(
  app: Express,
  requireAuth: any,
  requireRole: any,
  requireVillageAccess: any
) {
  // Get all roads for the manager's village
  app.get(
    "/api/village-roads",
    requireAuth,
    requireRole(["manager", "fieldworker"]),
    requireVillageAccess,
    async (req, res) => {
      try {
        const villageId = req.session.villageId!;
        const roads = await getVillageRoads(villageId);
        res.json(roads);
      } catch (error) {
        console.error("[VillageRoads] GET error:", error);
        res.status(500).json({ message: "Failed to get village roads" });
      }
    }
  );

  // Save a new recorded road
  app.post(
    "/api/village-roads",
    requireAuth,
    requireRole(["manager"]),
    requireVillageAccess,
    async (req, res) => {
      try {
        const villageId = req.session.villageId!;
        const userId = req.session.userId!;
        const { name, coordinates, distanceMeters } = req.body;

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
          return res.status(400).json({ message: "At least 2 coordinate points required" });
        }

        const valid = coordinates.every(
          (c: any) =>
            Array.isArray(c) &&
            c.length === 2 &&
            typeof c[0] === "number" &&
            typeof c[1] === "number"
        );
        if (!valid) {
          return res.status(400).json({ message: "Invalid coordinate format" });
        }

        const road = await createVillageRoad({
          villageId,
          name: name || "Road",
          coordinates,
          distanceMeters: distanceMeters || 0,
          recordedBy: userId,
        });

        res.status(201).json(road);
      } catch (error) {
        console.error("[VillageRoads] POST error:", error);
        res.status(500).json({ message: "Failed to save road" });
      }
    }
  );

  // Update road (name, coordinates, distance)
  app.patch(
    "/api/village-roads/:id",
    requireAuth,
    requireRole(["manager"]),
    requireVillageAccess,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid road id" });
        const villageId = req.session.villageId!;
        const { name, coordinates, distanceMeters } = req.body;

        const updates: { name?: string; coordinates?: [number, number][]; distanceMeters?: number } = {};
        if (name && typeof name === "string" && name.trim().length > 0) updates.name = name.trim();
        if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
          if (!validateCoordinates(coordinates)) {
            return res.status(400).json({ message: "Invalid coordinates: each point must be [lat, lng] with valid ranges" });
          }
          updates.coordinates = coordinates;
        }
        if (typeof distanceMeters === "number" && Number.isFinite(distanceMeters)) updates.distanceMeters = distanceMeters;

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "No valid updates provided" });
        }

        const road = await updateVillageRoad(id, villageId, updates);
        if (!road) {
          return res.status(404).json({ message: "Road not found" });
        }

        res.json(road);
      } catch (error) {
        console.error("[VillageRoads] PATCH error:", error);
        res.status(500).json({ message: "Failed to update road" });
      }
    }
  );

  // Delete a road
  app.delete(
    "/api/village-roads/:id",
    requireAuth,
    requireRole(["manager"]),
    requireVillageAccess,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const villageId = req.session.villageId!;

        const deleted = await deleteVillageRoad(id, villageId);
        if (!deleted) {
          return res.status(404).json({ message: "Road not found" });
        }

        res.json({ message: "Road deleted" });
      } catch (error) {
        console.error("[VillageRoads] DELETE error:", error);
        res.status(500).json({ message: "Failed to delete road" });
      }
    }
  );
}
