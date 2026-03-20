import type { Express } from "express";
import { storage } from "../../storage";
import { logAction } from "../audit/audit.storage";

// Strip sensitive fields from household data based on role
function sanitizeHousehold(h: any, role?: string) {
  if (!h) return h;
  const { generatorPassword, ...withoutPassword } = h;

  // Collectors only need: id, uid, headName, houseNumber, ward, status, villageId, householdType, qrPrinted
  if (role === 'collector') {
    return {
      id: h.id,
      uid: h.uid,
      headName: h.headName,
      houseNumber: h.houseNumber,
      ward: h.ward,
      status: h.status,
      villageId: h.villageId,
      householdType: h.householdType,
      qrPrinted: h.qrPrinted,
    };
  }

  // Managers get everything except generatorPassword
  return withoutPassword;
}

export function registerHouseholdRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  // List households for a village
  app.get('/api/households', requireAuth, requireRole(['manager', 'collector']), requireVillageAccess, async (req, res) => {
    try {
      const villageId = req.session.villageId!;
      const households = await storage.getHouseholdsByVillage(villageId);
      const role = req.session.role;
      res.json(households.map((h: any) => sanitizeHousehold(h, role)));
    } catch (error) {
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
      const role = req.session.role;
      res.json({ ...result, data: result.data.map((h: any) => sanitizeHousehold(h, role)) });
    } catch (error) {
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
      res.json(sanitizeHousehold(household, userRole));
    } catch (error) {
      res.status(500).json({ message: "Failed to get household" });
    }
  });

  app.delete('/api/households/:id', requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verify household belongs to user's village (managers only)
      if (req.session.role === 'manager') {
        const households = await storage.getHouseholdsByVillage(req.session.villageId!);
        const found = households.find((h: any) => h.id === id);
        if (!found) {
          return res.status(404).json({ message: "Household not found" });
        }
      }

      // Get household info before deleting for audit
      const households = await storage.getHouseholdsByVillage(req.session.villageId || '');
      const householdInfo = households.find((h: any) => h.id === id);

      await storage.deleteHousehold(id);

      logAction(req.session.villageId, req.session.userId!, 'deleted', 'household', id, {
        uid: householdInfo?.uid,
        headName: householdInfo?.headName,
        ward: householdInfo?.ward,
      });

      res.json({ message: "Household and related records deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete household" });
    }
  });
}
