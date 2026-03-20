import type { Express } from "express";
import { storage } from "../../storage";
import { insertDailyWasteLogSchema } from "@shared/schema";
import { z } from "zod";

export function registerDailyWasteLogRoutes(app: Express, requireAuth: any, requireRole: any, requireVillageAccess: any) {
    app.get('/api/material-log/daily-waste', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const { startDate, endDate } = req.query;

            const logs = await storage.getDailyWasteLogsByVillage(
                villageId,
                startDate as string | undefined,
                endDate as string | undefined
            );

            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch daily waste logs' });
        }
    });

    app.get('/api/material-log/daily-waste/:date', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const { date } = req.params;

            const log = await storage.getDailyWasteLogByDate(villageId, date);

            if (!log) {
                return res.status(404).json({ message: 'No log found for this date' });
            }

            res.json(log);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch daily waste log' });
        }
    });

    app.post('/api/material-log/daily-waste', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const userId = req.session.userId!;

            // Validate photo requirements
            const { wetWasteKg, dryWasteKg, rejectedWasteKg, sanitaryWasteKg,
                wetWastePhotoUrl, dryWastePhotoUrl, rejectedWastePhotoUrl, sanitaryWastePhotoUrl } = req.body;

            // if (parseFloat(wetWasteKg || '0') > 0 && !wetWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for wet waste when quantity > 0' });
            // }
            // if (parseFloat(dryWasteKg || '0') > 0 && !dryWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for dry waste when quantity > 0' });
            // }
            // if (parseFloat(rejectedWasteKg || '0') > 0 && !rejectedWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for rejected waste when quantity > 0' });
            // }
            // if (parseFloat(sanitaryWasteKg || '0') > 0 && !sanitaryWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for sanitary waste when quantity > 0' });
            // }

            // // Check if entry already exists for this date
            // const existing = await storage.getDailyWasteLogByDate(villageId, req.body.date);
            // if (existing) {
            //   return res.status(409).json({ message: 'An entry already exists for this date. Please edit the existing entry.' });
            // }

            const validatedData = insertDailyWasteLogSchema.parse({
                ...req.body,
                villageId,
                createdBy: userId
            });

            const log = await storage.createDailyWasteLog(validatedData);
            res.status(201).json(log);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation error', errors: error.errors });
            }
            res.status(500).json({ message: 'Failed to create daily waste log' });
        }
    });

    app.patch('/api/material-log/daily-waste/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const { id } = req.params;

            // Validate photo requirements
            const { wetWasteKg, dryWasteKg, rejectedWasteKg, sanitaryWasteKg,
                wetWastePhotoUrl, dryWastePhotoUrl, rejectedWastePhotoUrl, sanitaryWastePhotoUrl } = req.body;

            // if (parseFloat(wetWasteKg || '0') > 0 && !wetWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for wet waste when quantity > 0' });
            // }
            // if (parseFloat(dryWasteKg || '0') > 0 && !dryWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for dry waste when quantity > 0' });
            // }
            // if (parseFloat(rejectedWasteKg || '0') > 0 && !rejectedWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for rejected waste when quantity > 0' });
            // }
            // if (parseFloat(sanitaryWasteKg || '0') > 0 && !sanitaryWastePhotoUrl) {
            //   return res.status(400).json({ message: 'Photo required for sanitary waste when quantity > 0' });
            // }

            const log = await storage.updateDailyWasteLog(parseInt(id), req.body);
            res.json(log);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update daily waste log' });
        }
    });

    app.delete('/api/material-log/daily-waste/:id', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const { id } = req.params;
            await storage.deleteDailyWasteLog(parseInt(id));
            res.json({ message: 'Daily waste log deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete daily waste log' });
        }
    });
}
