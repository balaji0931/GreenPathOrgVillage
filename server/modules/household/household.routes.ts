import type { Express } from "express";
import { storage } from "../../storage";

export function registerHouseholdRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // List households for a village
  app.get('/api/households', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const households = await storage.getHouseholdsByVillage(villageId);
      res.json(households);
    } catch (error) {
      console.error("Get households error:", error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  app.get('/api/households/paginated', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 1500;
      const search = req.query.search as string;
      const ward = req.query.ward as string;
      const status = req.query.status as string;

      const result = await storage.getHouseholdsByVillagePaginated(villageId, {
        page,
        limit,
        search,
        ward,
        status
      });
      res.json(result);
    } catch (error) {
      console.error("Get paginated households error:", error);
      res.status(500).json({ message: "Failed to get households" });
    }
  });

  // Get single household by UID (for QR scanning)
  app.get('/api/households/:uid', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const { uid } = req.params;
      const household = await storage.getHouseholdByUid(uid);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      // Security: verify household belongs to requesting user's village
      // Admin and moderator roles are exempt (need cross-village visibility)
      const userRole = req.session.role;
      const userVillageId = req.session.villageId;
      if (
        userRole !== 'admin' &&
        userRole !== 'moderator' &&
        userVillageId &&
        household.villageId !== userVillageId
      ) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      console.error("Get household by UID error:", error);
      res.status(500).json({ message: "Failed to get household" });
    }
  });

  app.delete('/api/households/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHousehold(id);
      res.json({ message: "Household and related records deleted successfully" });
    } catch (error: any) {
      console.error("Delete household error:", error);
      res.status(500).json({ message: error.message || "Failed to delete household" });
    }
  });
}
