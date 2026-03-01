import type { Express } from "express";
import { storage } from "../../storage";
import { insertCompostProductionLogSchema } from "@shared/schema";
import { z } from "zod";

export function registerCompostLogRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
    // Compost Production Log endpoints
    app.get('/api/material-log/compost', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const { startDate, endDate } = req.query;

            const logs = await storage.getCompostProductionLogsByVillage(
                villageId,
                startDate as string | undefined,
                endDate as string | undefined
            );

            res.json(logs);
        } catch (error) {
            console.error('Get compost logs error:', error);
            res.status(500).json({ message: 'Failed to fetch compost production logs' });
        }
    });

    app.get('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const { id } = req.params;
            const log = await storage.getCompostProductionLogById(parseInt(id));

            if (!log) {
                return res.status(404).json({ message: 'Compost production log not found' });
            }

            res.json(log);
        } catch (error) {
            console.error('Get compost log error:', error);
            res.status(500).json({ message: 'Failed to fetch compost production log' });
        }
    });

    app.post('/api/material-log/compost', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const userId = req.session.userId!;

            // Validate mandatory photo
            if (!req.body.photoUrl) {
                return res.status(400).json({ message: 'Photo is required for compost production log' });
            }

            // Validate compost status
            const validStatuses = ['good', 'average', 'bad'];
            if (!validStatuses.includes(req.body.compostStatus?.toLowerCase())) {
                return res.status(400).json({ message: 'Compost status must be good, average, or bad' });
            }

            const validatedData = insertCompostProductionLogSchema.parse({
                ...req.body,
                compostStatus: req.body.compostStatus.toLowerCase(),
                villageId,
                createdBy: userId
            });

            const log = await storage.createCompostProductionLog(validatedData);
            res.status(201).json(log);
        } catch (error) {
            console.error('Create compost log error:', error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation error', errors: error.errors });
            }
            res.status(500).json({ message: 'Failed to create compost production log' });
        }
    });

    app.patch('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const { id } = req.params;

            // Validate mandatory photo if provided
            if (req.body.photoUrl === null || req.body.photoUrl === '') {
                return res.status(400).json({ message: 'Photo is required for compost production log' });
            }

            // Validate compost status if provided
            if (req.body.compostStatus) {
                const validStatuses = ['good', 'average', 'bad'];
                if (!validStatuses.includes(req.body.compostStatus?.toLowerCase())) {
                    return res.status(400).json({ message: 'Compost status must be good, average, or bad' });
                }
                req.body.compostStatus = req.body.compostStatus.toLowerCase();
            }

            const log = await storage.updateCompostProductionLog(parseInt(id), req.body);
            res.json(log);
        } catch (error) {
            console.error('Update compost log error:', error);
            res.status(500).json({ message: 'Failed to update compost production log' });
        }
    });

    app.delete('/api/material-log/compost/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const { id } = req.params;
            await storage.deleteCompostProductionLog(parseInt(id));
            res.json({ message: 'Compost production log deleted successfully' });
        } catch (error) {
            console.error('Delete compost log error:', error);
            res.status(500).json({ message: 'Failed to delete compost production log' });
        }
    });
}
