import type { Express } from "express";
import { storage } from "../../storage";
import {
  createVillageWithManager,
  getVillagesWithStats,
} from "./village.service";
import { logAction } from "../audit/audit.storage";

export function registerVillageRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Village routes
  app.post('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageName, managerName, managerPhone, paymentsEnabled, unitType, maxHouseholds } = req.body;

      const result = await createVillageWithManager({ villageName, managerName, managerPhone, paymentsEnabled, unitType, maxHouseholds });

      logAction(result.village?.villageId, req.session.userId!, 'created', 'village', result.village?.villageId, {
        villageName,
        managerName,
      });

      res.json(result);
    } catch (error) {
      console.error("VILLAGE CREATE ERR:", error);
      res.status(500).json({ message: "Failed to create village" });
    }
  });

  app.get('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const villagesWithStats = await getVillagesWithStats();
      res.json(villagesWithStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get villages" });
    }
  });



  app.get('/api/villages/:villageId', requireAuth, requireRole(['admin', 'manager', 'collector', 'generator', 'fieldworker']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const village = await storage.getVillageByVillageId(villageId);

      if (!village) {
        return res.status(404).json({ message: "Village not found" });
      }

      // Strip sensitive/internal fields for non-manager roles
      const userRole = req.session.role;
      if (userRole !== 'admin' && userRole !== 'manager') {
        const { vehicles, totalHouseholds, ...safeVillage } = village as any;
        return res.json(safeVillage);
      }

      res.json(village);
    } catch (error) {
      res.status(500).json({ message: "Failed to get village" });
    }
  });

  // Get wards for a village
  app.get('/api/villages/:villageId/wards', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const wards = await storage.getWardsByVillage(villageId);
      res.json(wards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wards" });
    }
  });

  // Add ward for a village
  app.post('/api/villages/:villageId/wards', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const { ward } = req.body;

      if (!ward || ward.trim() === '') {
        return res.status(400).json({ message: "Ward name is required" });
      }

      const updatedWards = await storage.addWardToVillage(villageId, ward.trim());

      logAction(villageId, req.session.userId!, 'created', 'ward', ward.trim(), {
        villageId,
      });

      res.json({ message: "Ward added successfully", wards: updatedWards });
    } catch (error: any) {
      if (error.message === "Ward already exists") {
        return res.status(400).json({ message: "Ward already exists" });
      }
      res.status(500).json({ message: "Failed to add ward" });
    }
  });

  app.patch('/api/villages/:villageId', requireAuth, requireRole(['admin', 'manager']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      // Security: Managers can only update specific fields if needed
      // but for now, we'll allow all partial updates as requested by the UI
      const village = await storage.updateVillage(villageId, updates);

      logAction(villageId, req.session.userId!, 'updated', 'village_settings', villageId, {
        updatedFields: Object.keys(updates),
      });

      res.json({ message: "Village updated successfully", village });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update village" });
    }
  });

  app.put('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      const village = await storage.updateVillage(villageId, updates);

      res.json({ message: "Village updated successfully", village });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update village" });
    }
  });

  app.delete('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      await storage.deleteVillage(villageId);

      logAction(villageId, req.session.userId!, 'deleted', 'village', villageId);

      res.json({ message: "Village deleted successfully" });
    } catch (error) {
      console.error("Village Deletion Error:", error); res.status(500).json({ message: "Failed to delete village" });
    }
  });
}
