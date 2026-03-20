import type { Express } from "express";
import { storage } from "../../storage";
import { logAction } from "../audit/audit.storage";

export function registerVehicleRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Vehicle Management Routes
  app.post('/api/villages/:villageId/vehicles', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      const { registrationNumber, name, collectorIds } = req.body;
      if (!registrationNumber || !name) {
        return res.status(400).json({ message: "Registration number and name are required" });
      }

      await storage.addVehicleToVillage(req.params.villageId, {
        registrationNumber,
        name,
        collectorIds: collectorIds || []
      });

      logAction(req.params.villageId, req.session.userId!, 'created', 'vehicle', registrationNumber, {
        name,
      });

      res.status(201).json({ message: "Vehicle added successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to add vehicle" });
    }
  });

  app.patch('/api/villages/:villageId/vehicles/:registrationNumber', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      const { name, collectorIds } = req.body;
      await storage.updateVehicleInVillage(req.params.villageId, req.params.registrationNumber, {
        name,
        collectorIds: collectorIds || []
      });
      res.json({ message: "Vehicle updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete('/api/villages/:villageId/vehicles/:registrationNumber', requireAuth, requireRole(['manager', 'admin']), requireVillageAccess, async (req, res) => {
    try {
      await storage.removeVehicleFromVillage(req.params.villageId, req.params.registrationNumber);

      logAction(req.params.villageId, req.session.userId!, 'deleted', 'vehicle', req.params.registrationNumber);

      res.json({ message: "Vehicle removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to remove vehicle" });
    }
  });

  app.patch('/api/collectors/:collectorId/vehicle', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const { registrationNumber } = req.body;
      const collectorId = parseInt(req.params.collectorId);

      await storage.updateCollectorVehicle(collectorId, registrationNumber);
      res.json({ message: "Collector vehicle updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update collector vehicle" });
    }
  });
}
