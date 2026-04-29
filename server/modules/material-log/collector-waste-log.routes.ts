import type { Express } from "express";
import { insertCollectorDailyWasteLogSchema } from "@shared/schema";
import { z } from "zod";
import * as collectorWasteLogStorage from "./collector-waste-log.storage";
import * as collectorStorage from "../collector/collector.storage";

export function registerCollectorWasteLogRoutes(
    app: Express,
    requireAuth: any,
    requireRole: any,
    requireVillageAccess: any,
) {
    // ─── Collector-facing routes ───────────────────────────────────

    /** GET /api/collector-waste-log - list own logs */
    app.get('/api/collector-waste-log', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.session.userId!;
            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            const { startDate, endDate } = req.query;
            const logs = await collectorWasteLogStorage.getCollectorWasteLogsByCollector(
                collector.id,
                startDate as string | undefined,
                endDate as string | undefined,
            );
            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch collector waste logs' });
        }
    });

    /** POST /api/collector-waste-log - create entry (multiple per day allowed) */
    app.post('/api/collector-waste-log', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.session.userId!;
            const villageId = req.session.villageId!;
            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            const validatedData = insertCollectorDailyWasteLogSchema.parse({
                ...req.body,
                collectorId: collector.id,
                villageId,
                createdBy: userId,
            });

            const log = await collectorWasteLogStorage.createCollectorWasteLog(validatedData);
            res.status(201).json(log);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: 'Validation error', errors: error.errors });
            }
            res.status(500).json({ message: 'Failed to create collector waste log' });
        }
    });

    /** PATCH /api/collector-waste-log/:id - update own entry */
    app.patch('/api/collector-waste-log/:id', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.session.userId!;
            const { id } = req.params;
            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            // Verify ownership
            const existing = await collectorWasteLogStorage.getCollectorWasteLogById(parseInt(id));
            if (!existing || existing.collectorId !== collector.id) {
                return res.status(403).json({ message: 'Not authorized to edit this entry' });
            }

            const log = await collectorWasteLogStorage.updateCollectorWasteLog(parseInt(id), req.body);
            res.json(log);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update collector waste log' });
        }
    });

    /** DELETE /api/collector-waste-log/:id - delete own entry */
    app.delete('/api/collector-waste-log/:id', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.session.userId!;
            const { id } = req.params;
            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            // Verify ownership
            const existing = await collectorWasteLogStorage.getCollectorWasteLogById(parseInt(id));
            if (!existing || existing.collectorId !== collector.id) {
                return res.status(403).json({ message: 'Not authorized to delete this entry' });
            }

            await collectorWasteLogStorage.deleteCollectorWasteLog(parseInt(id));
            res.json({ message: 'Collector waste log deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete collector waste log' });
        }
    });

    // ─── Manager-facing routes ────────────────────────────────────

    /** GET /api/collector-waste-log/village/:date - all collector entries for a village+date */
    app.get('/api/collector-waste-log/village/:date', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const { date } = req.params;
            const logs = await collectorWasteLogStorage.getCollectorWasteLogsByVillageAndDate(villageId, date);
            res.json(logs);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch collector waste logs' });
        }
    });

    /** GET /api/collector-waste-log/village/:date/summary - summed totals for pre-loading manager form */
    app.get('/api/collector-waste-log/village/:date/summary', requireAuth, requireRole(['manager']), requireVillageAccess, async (req, res) => {
        try {
            const villageId = req.session.villageId!;
            const { date } = req.params;
            const summary = await collectorWasteLogStorage.getCollectorWasteLogSummaryByVillageAndDate(villageId, date);
            res.json(summary || { wetWasteKg: 0, dryWasteKg: 0, specialCareWasteKg: 0, sanitaryWasteKg: 0, mixedWasteKg: 0, entryCount: 0 });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch collector waste log summary' });
        }
    });
}
