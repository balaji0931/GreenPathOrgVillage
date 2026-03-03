import type { Express } from "express";
import { storage } from "../../storage";
import bcrypt from "bcrypt";

export function registerModeratorOperationsRoutes(app: Express, requireAuth: any, requireRole: any) {
    app.get('/api/moderator/villages', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            res.json(villages);
        } catch (error) {
            console.error('Get moderator villages error:', error);
            res.status(500).json({ message: "Failed to get villages" });
        }
    });

    // Create announcement for moderator villages only
    app.post('/api/moderator/announcements', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const { message, targetAudience, photoUrl } = req.body;

            if (!message || !targetAudience) {
                return res.status(400).json({ message: "Message and target audience are required" });
            }

            // Get villages assigned to this moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);

            if (assignedVillages.length === 0) {
                return res.status(400).json({ message: "No villages assigned to moderator" });
            }

            // Create announcements for each assigned village
            const announcements = [];
            for (const village of assignedVillages) {
                const announcement = await storage.createAnnouncement({
                    message,
                    targetAudience,
                    villageId: village.villageId,
                    createdBy: moderatorId,
                    photoUrl: photoUrl || null,
                });
                announcements.push(announcement);
            }

            res.json({
                message: `Announcements created successfully for ${announcements.length} villages`,
                announcements,
                villageCount: announcements.length
            });
        } catch (error) {
            console.error('Create moderator announcement error:', error);
            res.status(500).json({ message: "Failed to create announcement" });
        }
    });

    // Get issues for moderator villages only
    app.get('/api/moderator/issues', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            const villageIds = villages.map(v => v.villageId);

            const issues = await storage.getModeratorIssues(villageIds);
            res.json(issues);
        } catch (error) {
            console.error('Get moderator issues error:', error);
            res.status(500).json({ message: "Failed to get issues" });
        }
    });

    // Get collectors for moderator villages only
    app.get('/api/moderator/collectors', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            const villageIds = villages.map(v => v.villageId);

            const collectors = await storage.getModeratorCollectors(villageIds);
            res.json(collectors);
        } catch (error) {
            console.error('Get moderator collectors error:', error);
            res.status(500).json({ message: "Failed to get collectors" });
        }
    });

    // Get households for moderator villages only
    app.get('/api/moderator/households', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const villages = await storage.getModeratorVillages(moderatorId);
            const villageIds = villages.map(v => v.villageId);

            const households = await storage.getModeratorHouseholds(villageIds);
            res.json(households);
        } catch (error) {
            console.error('Get moderator households error:', error);
            res.status(500).json({ message: "Failed to get households" });
        }
    });

    app.get('/api/moderator/village/:villageId/details', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { villageId } = req.params;
            const moderatorId = req.session.userId!;

            // Verify that this village is assigned to the moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this village" });
            }

            const details = await storage.getVillageDetails(villageId);

            // Add recent collections data for village performance charts
            const recentCollections = await storage.getRecentCollectionsByVillage(villageId, 7);
            details.recentCollections = recentCollections;

            res.json(details);
        } catch (error) {
            console.error("Get moderator village details error:", error);
            res.status(500).json({ message: "Failed to get village details" });
        }
    });

    app.get('/api/moderator/village/:villageId/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { villageId } = req.params;
            const moderatorId = req.session.userId!;

            // Verify that this village is assigned to the moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this village" });
            }

            const managers = await storage.getManagersByVillage(villageId);
            res.json(managers);
        } catch (error) {
            console.error("Get village managers error:", error);
            res.status(500).json({ message: "Failed to get village managers" });
        }
    });

    // Add general moderator managers endpoint
    app.get('/api/moderator/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const moderatorId = req.session.userId!;
            const assignedVillages = await storage.getModeratorVillages(moderatorId);

            const allManagers = [];
            for (const village of assignedVillages) {
                const managers = await storage.getManagersByVillage(village.villageId);
                allManagers.push(...managers.map(manager => ({
                    ...manager,
                    villageName: village.name
                })));
            }

            res.json(allManagers);
        } catch (error) {
            console.error("Get moderator managers error:", error);
            res.status(500).json({ message: "Failed to get managers" });
        }
    });

    // Add manager to village for moderator
    app.post('/api/moderator/village/:villageId/managers', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { villageId } = req.params;
            const { managerName, managerPhone } = req.body;
            const moderatorId = req.session.userId!;

            // Verify that this village is assigned to the moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this village" });
            }

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

    // Reset manager password for moderator
    app.put('/api/moderator/managers/:managerId/reset-password', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { managerId } = req.params;
            const moderatorId = req.session.userId!;

            // Get manager details to check village access
            const manager = await storage.getUserByUserId(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(404).json({ message: "Manager not found" });
            }

            // Verify moderator has access to this manager's village
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === manager.villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this manager" });
            }

            const newPassword = managerId; // Reset to manager ID
            const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 10);
            await storage.updateUserPassword(managerId, hashedPassword);

            res.json({ message: "Password reset successfully", newPassword });
        } catch (error) {
            console.error("Reset manager password error:", error);
            res.status(500).json({ message: "Failed to reset manager password" });
        }
    });

    // Delete manager for moderator
    app.delete('/api/moderator/managers/:managerId', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { managerId } = req.params;
            const moderatorId = req.session.userId!;

            // Get manager details to check village access
            const manager = await storage.getUserByUserId(managerId);
            if (!manager || manager.role !== 'manager') {
                return res.status(404).json({ message: "Manager not found" });
            }

            // Verify moderator has access to this manager's village
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === manager.villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this manager" });
            }

            await storage.deleteUser(managerId);
            res.json({ message: "Manager deleted successfully" });
        } catch (error) {
            console.error("Delete manager error:", error);
            res.status(500).json({ message: "Failed to delete manager" });
        }
    });

    app.get('/api/moderator/village/:villageId/issues', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { villageId } = req.params;
            const moderatorId = req.session.userId!;

            // Verify that this village is assigned to the moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this village" });
            }

            const issues = await storage.getIssuesByVillage(villageId);
            res.json(issues);
        } catch (error) {
            console.error("Get village issues error:", error);
            res.status(500).json({ message: "Failed to get village issues" });
        }
    });

    app.patch('/api/moderator/issues/:id', requireAuth, requireRole(['moderator']), async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const moderatorId = req.session.userId!;

            // Get the issue to verify village access
            const issue = await storage.getIssueById(parseInt(id));
            if (!issue) {
                return res.status(404).json({ message: "Issue not found" });
            }

            // Verify that this village is assigned to the moderator
            const assignedVillages = await storage.getModeratorVillages(moderatorId);
            const isAssigned = assignedVillages.some(v => v.villageId === issue.villageId);

            if (!isAssigned) {
                return res.status(403).json({ message: "Access denied to this village" });
            }

            const updatedIssue = await storage.updateIssue(parseInt(id), updates);
            res.json(updatedIssue);
        } catch (error) {
            console.error("Update issue error:", error);
            res.status(500).json({ message: "Failed to update issue" });
        }
    });
}
