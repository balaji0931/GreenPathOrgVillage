import type { Express } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";

export function registerVillageRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // Village routes
  app.post('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageName, managerName, managerPhone } = req.body;

      // Generate village ID
      const villages = await storage.getVillages();

      // Extract just the numeric parts from all village IDs (e.g., 'V013' → 13)
      const maxIdNumber = villages.reduce((max, v) => {
        const num = parseInt(v.villageId?.slice(1) || "0");
        return num > max ? num : max;
      }, 0);

      // Assign the next unique ID
      const villageId = `V${String(maxIdNumber + 1).padStart(3, '0')}`;


      // Create village
      const village = await storage.createVillage({
        villageId,
        name: villageName,
      });

      // Create manager
      const managerId = `${villageId}-M1`;
      const hashedPassword = await bcrypt.hash(managerId, 10);

      const manager = await storage.createUser({
        userId: managerId,
        password: hashedPassword,
        role: 'manager',
        name: managerName,
        phone: managerPhone,
        villageId,
      });

      res.json({
        village,
        manager: {
          ...manager,
          credentials: {
            userId: managerId,
            password: managerId
          }
        }
      });
    } catch (error) {
      console.error("Create village error:", error);
      res.status(500).json({ message: "Failed to create village" });
    }
  });

  app.get('/api/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const villages = await storage.getVillages();
      const villagesWithStats = await Promise.all(
        villages.slice(0, 50).map(async (village) => { // Limit to first 50 for performance
          const stats = await storage.getVillageStats(village.villageId);
          return { ...village, ...stats };
        })
      );
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
      const village = await storage.updateVillage(req.params.villageId, req.body);
      res.json(village);
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

  // Update village settings (including image upload requirement)
  app.put('/api/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const updates = req.body;

      const village = await storage.updateVillage(villageId, updates);

      res.json({ message: "Village updated successfully", village });
    } catch (error) {
      console.error("Update village error:", error);
      res.status(500).json({ message: "Failed to update village" });
    }
  });
}
