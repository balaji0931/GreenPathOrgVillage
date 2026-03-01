import type { Express } from "express";
import { storage } from "../../storage";
import {
  createVillageWithManager,
  getVillagesWithStats,
} from "./village.service";

export function registerVillageRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Village routes
  app.post('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageName, managerName, managerPhone } = req.body;

      const result = await createVillageWithManager({ villageName, managerName, managerPhone });

      res.json(result);
    } catch (error) {
      console.error("Create village error:", error);
      res.status(500).json({ message: "Failed to create village" });
    }
  });

  app.get('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const villagesWithStats = await getVillagesWithStats();
      res.json(villagesWithStats);
    } catch (error) {
      console.error("Get villages error:", error);
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

      res.json(village);
    } catch (error) {
      console.error("Get village error:", error);
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
      console.error("Get wards error:", error);
      res.status(500).json({ message: "Failed to get wards" });
    }
  });

  // Add ward for a village
  app.post('/api/villages/:villageId/wards', requireAuth, requireRole(['manager']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { ward } = req.body;

      if (!ward || ward.trim() === '') {
        return res.status(400).json({ message: "Ward name is required" });
      }

      const updatedWards = await storage.addWardToVillage(villageId, ward.trim());

      res.json({ message: "Ward added successfully", wards: updatedWards });
    } catch (error: any) {
      console.error("Add ward error:", error);
      if (error.message === "Ward already exists") {
        return res.status(400).json({ message: "Ward already exists" });
      }
      res.status(500).json({ message: "Failed to add ward" });
    }
  });

  app.put('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      const village = await storage.updateVillage(villageId, updates);

      res.json({ message: "Village updated successfully", village });
    } catch (error: any) {
      console.error("Update village error:", error);
      res.status(500).json({ message: error.message || "Failed to update village" });
    }
  });

  app.delete('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      await storage.deleteVillage(villageId);

      res.json({ message: "Village deleted successfully" });
    } catch (error) {
      console.error("Delete village error:", error);
      res.status(500).json({ message: "Failed to delete village" });
    }
  });
}
