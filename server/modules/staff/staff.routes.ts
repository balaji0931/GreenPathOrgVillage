import type { Express } from "express";
import * as staffStorage from "./staff.storage";
import { logAction } from "../audit/audit.storage";

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
  next();
};

const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!roles.includes(req.session?.role)) return res.status(403).json({ message: "Forbidden" });
  next();
};

const requireVillageAccess = (req: any, res: any, next: any) => {
  if (!req.session?.villageId) return res.status(403).json({ message: "No village access" });
  next();
};

export function registerStaffRoutes(app: Express) {
  // List staff by type
  app.get("/api/staff", requireAuth, requireVillageAccess, async (req, res) => {
    try {
      const staffType = req.query.type as string;
      if (staffType && !["helper", "segregator"].includes(staffType)) {
        return res.status(400).json({ message: "Invalid type. Use helper or segregator." });
      }
      const staff = staffType
        ? await staffStorage.getStaffByType(req.session.villageId!, staffType)
        : await staffStorage.getAllStaff(req.session.villageId!);
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Create staff member
  app.post("/api/staff", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      const { name, phone, staffType, workType } = req.body;
      if (!name || !staffType) {
        return res.status(400).json({ message: "name and staffType are required" });
      }
      if (!["helper", "segregator"].includes(staffType)) {
        return res.status(400).json({ message: "staffType must be helper or segregator" });
      }

      const staff = await staffStorage.createStaff({
        villageId: req.session.villageId!,
        name,
        phone,
        staffType,
        workType: staffType === "helper" ? workType : undefined,
      });

      logAction(req.session.villageId!, req.session.userId!, "created", "village_staff", String(staff.id), {
        name, staffType, workType,
      });

      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  // Delete (soft) staff member
  app.delete("/api/staff/:id", requireAuth, requireRole(["manager"]), requireVillageAccess, async (req, res) => {
    try {
      await staffStorage.deleteStaff(parseInt(req.params.id));
      logAction(req.session.villageId!, req.session.userId!, "deleted", "village_staff", req.params.id, {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });
}
