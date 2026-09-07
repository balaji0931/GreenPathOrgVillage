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
            const userId = req.user?.userId || req.session?.userId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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

    /** POST /api/collector-waste-log - create entry (multiple per day allowed, but only for today) */
    app.post('/api/collector-waste-log', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.user?.userId || req.session?.userId;
            const villageId = req.user?.villageId || req.session?.villageId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            // Collectors are only allowed to enter logs for today; date is auto-fetched
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

            const body = req.body || {};
            const wetWasteKg = body.wetWasteKg ?? body.wetKg ?? '0';
            const dryWasteKg = body.dryWasteKg ?? body.dryKg ?? '0';
            const specialCareWasteKg = body.specialCareWasteKg ?? body.specialCareKg ?? '0';
            const sanitaryWasteKg = body.sanitaryWasteKg ?? body.sanitaryKg ?? '0';
            const mixedWasteKg = body.mixedWasteKg ?? body.mixedKg ?? '0';
            const remarks = body.remarks ?? body.notes ?? '';

            const validatedData = insertCollectorDailyWasteLogSchema.parse({
                collectorId: collector.id,
                villageId: villageId || collector.villageId,
                date: today,
                wetWasteKg: String(wetWasteKg || '0'),
                dryWasteKg: String(dryWasteKg || '0'),
                specialCareWasteKg: String(specialCareWasteKg || '0'),
                sanitaryWasteKg: String(sanitaryWasteKg || '0'),
                mixedWasteKg: String(mixedWasteKg || '0'),
                remarks: String(remarks || ''),
                wetWastePhotoUrl: body.wetWastePhotoUrl || null,
                dryWastePhotoUrl: body.dryWastePhotoUrl || null,
                specialCareWastePhotoUrl: body.specialCareWastePhotoUrl || null,
                sanitaryWastePhotoUrl: body.sanitaryWastePhotoUrl || null,
                mixedWastePhotoUrl: body.mixedWastePhotoUrl || null,
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

    /** PATCH /api/collector-waste-log/:id - update own entry (only today's entry allowed) */
    app.patch('/api/collector-waste-log/:id', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.user?.userId || req.session?.userId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

            const { id } = req.params;
            const collector = await collectorStorage.getCollectorByUid(userId);
            if (!collector) return res.status(404).json({ message: 'Collector not found' });

            // Verify ownership
            const existing = await collectorWasteLogStorage.getCollectorWasteLogById(parseInt(id));
            if (!existing || existing.collectorId !== collector.id) {
                return res.status(403).json({ message: 'Not authorized to edit this entry' });
            }

            // Collectors should not be allowed to edit logs of other days
            const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
            const existingDateStr = typeof existing.date === 'string'
                ? existing.date
                : new Date(existing.date).toISOString().split('T')[0];

            if (existingDateStr !== today) {
                return res.status(403).json({
                    message: "Collectors are not allowed to edit logs from past days. Only today's logs can be edited."
                });
            }

            const body = req.body || {};
            // Never allow changing the log date
            delete body.date;

            const updatePayload: any = {};
            if (body.wetWasteKg !== undefined) updatePayload.wetWasteKg = String(body.wetWasteKg);
            else if (body.wetKg !== undefined) updatePayload.wetWasteKg = String(body.wetKg);

            if (body.dryWasteKg !== undefined) updatePayload.dryWasteKg = String(body.dryWasteKg);
            else if (body.dryKg !== undefined) updatePayload.dryWasteKg = String(body.dryKg);

            if (body.specialCareWasteKg !== undefined) updatePayload.specialCareWasteKg = String(body.specialCareWasteKg);
            else if (body.specialCareKg !== undefined) updatePayload.specialCareWasteKg = String(body.specialCareKg);

            if (body.sanitaryWasteKg !== undefined) updatePayload.sanitaryWasteKg = String(body.sanitaryWasteKg);
            else if (body.sanitaryKg !== undefined) updatePayload.sanitaryWasteKg = String(body.sanitaryKg);

            if (body.mixedWasteKg !== undefined) updatePayload.mixedWasteKg = String(body.mixedWasteKg);
            else if (body.mixedKg !== undefined) updatePayload.mixedWasteKg = String(body.mixedKg);

            if (body.remarks !== undefined) updatePayload.remarks = body.remarks;
            else if (body.notes !== undefined) updatePayload.remarks = body.notes;

            if (body.wetWastePhotoUrl !== undefined) updatePayload.wetWastePhotoUrl = body.wetWastePhotoUrl;
            if (body.dryWastePhotoUrl !== undefined) updatePayload.dryWastePhotoUrl = body.dryWastePhotoUrl;
            if (body.specialCareWastePhotoUrl !== undefined) updatePayload.specialCareWastePhotoUrl = body.specialCareWastePhotoUrl;
            if (body.sanitaryWastePhotoUrl !== undefined) updatePayload.sanitaryWastePhotoUrl = body.sanitaryWastePhotoUrl;
            if (body.mixedWastePhotoUrl !== undefined) updatePayload.mixedWastePhotoUrl = body.mixedWastePhotoUrl;

            const log = await collectorWasteLogStorage.updateCollectorWasteLog(parseInt(id), updatePayload);
            res.json(log);
        } catch (error) {
            res.status(500).json({ message: 'Failed to update collector waste log' });
        }
    });

    /** DELETE /api/collector-waste-log/:id - delete own entry */
    app.delete('/api/collector-waste-log/:id', requireAuth, requireRole(['collector']), requireVillageAccess, async (req, res) => {
        try {
            const userId = req.user?.userId || req.session?.userId;
            if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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
            const villageId = req.user?.villageId || req.session?.villageId;
            if (!villageId) return res.status(401).json({ message: 'Unauthorized' });
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
            const villageId = req.user?.villageId || req.session?.villageId;
            if (!villageId) return res.status(401).json({ message: 'Unauthorized' });
            const { date } = req.params;
            const summary = await collectorWasteLogStorage.getCollectorWasteLogSummaryByVillageAndDate(villageId, date);
            res.json(summary || { wetWasteKg: 0, dryWasteKg: 0, specialCareWasteKg: 0, sanitaryWasteKg: 0, mixedWasteKg: 0, entryCount: 0 });
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch collector waste log summary' });
        }
    });
}
