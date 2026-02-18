import type { Express } from "express";
import { storage } from "../storage";
import bcrypt from "bcrypt";

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
      const newPassword = managerId; // Reset to manager ID
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUserPassword(managerId, hashedPassword);

      res.json({ message: "Password reset successfully", newPassword });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get('/api/villages/:villageId/details', requireAuth, requireRole(['admin']), requireVillageAccess, async (req, res) => {
    try {
      const { villageId } = req.params;
      const details = await storage.getVillageDetails(villageId);
      res.json(details);
    } catch (error) {
      console.error("Get village details error:", error);
      res.status(500).json({ message: "Failed to get village details" });
    }
  });

  app.post('/api/villages/:villageId/managers', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { villageId } = req.params;
      const { managerName, managerPhone } = req.body;

      const manager = await storage.addManagerToVillage({
        villageId,
        managerName,
        managerPhone,
      });

      res.json({
        manager: {
          ...manager,
          credentials: {
            userId: manager.userId,
            password: manager.userId // Password is same as userId
          }
        }
      });
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

  app.put('/api/managers/:managerId/reset-password', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { managerId } = req.params;
      const newPassword = managerId; // Reset to userId
      await storage.updateUserPassword(managerId, newPassword);
      res.json({ newPassword });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { name, phone, email, villageIds = [] } = req.body;
      const createdBy = req.session.userId!;

      // Generate moderator ID safely
      const existingModerators = await storage.getModeratorsList();

      // Extract existing numbers from IDs like "MOD-001"
      const usedNumbers = existingModerators
        .map((mod) => {
          const match = mod.moderatorId.match(/MOD-(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      // Find the first available number
      let moderatorNumber = 1;
      for (const n of usedNumbers) {
        if (n === moderatorNumber) {
          moderatorNumber++;
        } else {
          break;
        }
      }

      const moderatorId = `MOD-${String(moderatorNumber).padStart(3, '0')}`;


      // Create moderator
      const moderator = await storage.createModerator({
        moderatorId,
        name,
        phone,
        email,
        createdBy,
      });

      // Assign villages if provided
      for (const villageId of villageIds) {
        await storage.assignVillageToModerator({
          moderatorId,
          villageId,
          assignedBy: createdBy,
        });
      }

      res.json({
        moderator,
        credentials: {
          userId: moderatorId,
          password: moderatorId,
        },
      });
    } catch (error) {
      console.error("Create moderator error:", error);
      res.status(500).json({ message: "Failed to create moderator" });
    }
  });

  app.get('/api/moderators', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const moderators = await storage.getModeratorsList();

      // Get village assignments for each moderator (limited to first 50 for performance)
      const moderatorsWithVillages = await Promise.all(
        moderators.slice(0, 50).map(async (moderator) => {
          const villages = await storage.getModeratorVillages(moderator.moderatorId);
          return { ...moderator, villages };
        })
      );

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
      const newPassword = moderatorId; // Reset to moderator ID
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(moderatorId, hashedPassword);
      res.json({ newPassword });
    } catch (error) {
      console.error("Reset moderator password error:", error);
      res.status(500).json({ message: "Failed to reset moderator password" });
    }
  });
}
