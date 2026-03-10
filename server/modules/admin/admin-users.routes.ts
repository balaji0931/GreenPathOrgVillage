import type { Express } from "express";
import { storage } from "../../storage";
import bcrypt from "bcrypt";
import {
  createModerator,
  getModeratorsWithVillages,
  resetPasswordToUserId,
  addManagerToVillage,
} from "./admin-users.service";

export function registerAdminUsersRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
  app.get('/api/managers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const managers = await storage.getManagersList();
      res.json(managers);
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({ message: "Failed to get managers" });
    }
  });



  app.put('/api/managers/:managerId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const newPassword = await resetPasswordToUserId(managerId);

      res.json({ message: "Password reset successfully", newPassword });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });



  app.post('/api/villages/:villageId/managers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { managerName, managerPhone } = req.body;

      const result = await addManagerToVillage(villageId, { managerName, managerPhone });

      res.json(result);
    } catch (error) {
      console.error("Add manager error:", error);
      res.status(500).json({ message: "Failed to add manager" });
    }
  });

  app.delete('/api/managers/:managerId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      await storage.deleteUser(managerId);
      res.json({ message: "Manager deleted successfully" });
    } catch (error) {
      console.error("Delete manager error:", error);
      res.status(500).json({ message: "Failed to delete manager" });
    }
  });

  app.post('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { name, phone, email, villageIds = [] } = req.body;
      const createdBy = req.session.userId!;

      const result = await createModerator({ name, phone, email, villageIds, createdBy });

      res.json(result);
    } catch (error) {
      console.error("Create moderator error:", error);
      res.status(500).json({ message: "Failed to create moderator" });
    }
  });

  app.get('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const moderatorsWithVillages = await getModeratorsWithVillages();

      res.json(moderatorsWithVillages);
    } catch (error) {
      console.error("Get moderators error:", error);
      res.status(500).json({ message: "Failed to get moderators" });
    }
  });



  app.put('/api/moderators/:moderatorId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const updates = req.body;

      const moderator = await storage.updateModerator(moderatorId, updates);
      res.json(moderator);
    } catch (error) {
      console.error("Update moderator error:", error);
      res.status(500).json({ message: "Failed to update moderator" });
    }
  });

  app.delete('/api/moderators/:moderatorId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      await storage.deleteModerator(moderatorId);
      res.json({ message: "Moderator deleted successfully" });
    } catch (error) {
      console.error("Delete moderator error:", error);
      res.status(500).json({ message: "Failed to delete moderator" });
    }
  });

  app.post('/api/moderators/:moderatorId/villages', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const { villageId } = req.body;
      const assignedBy = req.session.userId!;

      const assignment = await storage.assignVillageToModerator({
        moderatorId,
        villageId,
        assignedBy,
      });

      res.json(assignment);
    } catch (error) {
      console.error("Assign village to moderator error:", error);
      res.status(500).json({ message: "Failed to assign village to moderator" });
    }
  });

  app.delete('/api/moderators/:moderatorId/villages/:villageId', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId, villageId } = req.params;
      await storage.removeVillageFromModerator(moderatorId, villageId);
      res.json({ message: "Village removed from moderator successfully" });
    } catch (error) {
      console.error("Remove village from moderator error:", error);
      res.status(500).json({ message: "Failed to remove village from moderator" });
    }
  });

  app.get('/api/moderators/:moderatorId/villages', requireAuth, requireRole(['admin', 'moderator']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const villages = await storage.getModeratorVillages(moderatorId);
      res.json(villages);
    } catch (error) {
      console.error("Get moderator villages error:", error);
      res.status(500).json({ message: "Failed to get moderator villages" });
    }
  });

  app.put('/api/moderators/:moderatorId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { moderatorId } = req.params;
      const newPassword = await resetPasswordToUserId(moderatorId);

      res.json({ newPassword });
    } catch (error) {
      console.error("Reset moderator password error:", error);
      res.status(500).json({ message: "Failed to reset moderator password" });
    }
  });
}
