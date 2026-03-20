/**
 * Export Routes — CSV export endpoints.
 * 3 endpoints: estimate, single, bulk (ZIP).
 */
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import archiver from 'archiver';
import { rateLimitExport } from './export.middleware';

// Register the encrypted ZIP format
// @ts-ignore — no type declarations available
import archiverZipEncrypted from 'archiver-zip-encrypted';
archiver.registerFormat('zip-encrypted', archiverZipEncrypted);
import {
  buildCsv, setCsvHeaders, setZipHeaders, CSV_BOM,
  EXPORT_SENSITIVITY, EXPORT_LABELS, VALID_EXPORT_TYPES,
  MAX_EXPORT_SIZE_KB, AVG_BYTES_PER_ROW, generateSuggestedPassword,
  csvHeader, toCsvRow,
} from './csv.utils';
import {
  estimateExport, getVillageName,
  getHouseholdsForExport, HOUSEHOLD_HEADERS, householdToRow,
  getCollectionsForExport, COLLECTION_HEADERS, collectionToRow,
  getDailyWasteForExport, DAILY_WASTE_HEADERS, dailyWasteToRow,
  getCompostForExport, COMPOST_HEADERS, compostToRow,
  getSalesForExport, SALES_HEADERS, salesToRow,
  getPaymentsForExport, PAYMENT_HEADERS, paymentToRow,
  getCollectorsForExport, COLLECTOR_HEADERS, collectorToRow,
  getIssuesForExport, ISSUE_HEADERS, issueToRow,
  getCoverageForExport, COVERAGE_HEADERS, coverageToRow,
  getWardDailyForExport, WARD_DAILY_HEADERS, wardDailyToRow,
  getVehicleDailyForExport, VEHICLE_DAILY_HEADERS, vehicleDailyToRow,
} from './export.storage';
import { logAction } from '../audit/audit.storage';

// ═══════════════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════════════

const exportItemSchema = z.object({
  type: z.enum(VALID_EXPORT_TYPES as [string, ...string[]]),
  from: z.string().optional(),
  to: z.string().optional(),
  billingMonth: z.string().optional(),
});

const estimateSchema = z.object({
  villageIds: z.array(z.string()).min(1),
  exports: z.array(exportItemSchema).min(1),
});

const bulkExportSchema = z.object({
  villageIds: z.array(z.string()).min(1),
  exports: z.array(exportItemSchema).min(1),
  password: z.string().nullable().optional(),
  includeSummary: z.boolean().optional().default(true),
  maskPersonalData: z.boolean().optional().default(false),
  terms: z.array(z.string()).min(3),
});

// Export types that need date ranges
const RANGED_EXPORTS = ['collections', 'daily-waste', 'compost', 'sales', 'issues', 'coverage', 'ward-daily', 'vehicle-daily'];
// Export types that need billing month
const MONTHLY_EXPORTS = ['payments'];

// ═══════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════

export function registerExportRoutes(
  app: Express,
  requireAuth: any,
  requireRole: any,
  requireVillageAccess: any
) {
  const exportAuth = [requireAuth, requireRole(['manager', 'moderator', 'admin'])];

  // ─── Estimate endpoint ───
  app.post('/api/export/estimate', ...exportAuth, async (req: Request, res: Response) => {
    try {
      const body = estimateSchema.parse(req.body);
      const user = {
        userId: req.session.userId!,
        role: req.session.role!,
        villageId: req.session.villageId,
      };

      // Validate village access
      const accessibleVillages = await getAccessibleVillages(user, body.villageIds);
      if (accessibleVillages.length === 0) {
        return res.status(403).json({ message: 'No access to requested villages' });
      }

      const estimates: any[] = [];
      let totalRows = 0;
      let totalSizeKB = 0;

      for (const villageId of accessibleVillages) {
        const villageName = await getVillageName(villageId);

        for (const exp of body.exports) {
          const rowCount = await estimateExport(villageId, exp.type, exp.from, exp.to, exp.billingMonth);
          const sizeKB = Math.round((rowCount * AVG_BYTES_PER_ROW) / 1024);

          estimates.push({
            villageId,
            villageName,
            type: exp.type,
            label: EXPORT_LABELS[exp.type],
            rowCount,
            sizeKB,
            sensitivity: EXPORT_SENSITIVITY[exp.type],
          });

          totalRows += rowCount;
          totalSizeKB += sizeKB;
        }
      }

      const isSensitive = accessibleVillages.length > 1 ||
        user.role === 'admin' ||
        totalRows > 50000;

      const exceedsSizeLimit = totalSizeKB > MAX_EXPORT_SIZE_KB;

      res.json({
        estimates,
        totalRows,
        totalSizeKB,
        estimatedTimeSec: Math.max(1, Math.ceil(totalRows / 15000)),
        isSensitive,
        exceedsSizeLimit,
        suggestedPassword: generateSuggestedPassword(),
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to estimate export' });
    }
  });

  // ─── Single CSV export ───
  app.get('/api/export/single', ...exportAuth, rateLimitExport, async (req: Request, res: Response) => {
    try {
      const user = {
        userId: req.session.userId!,
        role: req.session.role!,
        villageId: req.session.villageId,
        name: req.session.userId,
      };
      const villageId = req.query.villageId as string;
      const type = req.query.type as string;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const billingMonth = req.query.billingMonth as string | undefined;
      const mask = req.query.mask === 'true';

      if (!villageId || !type || !VALID_EXPORT_TYPES.includes(type)) {
        return res.status(400).json({ message: 'villageId and valid type are required' });
      }

      // Validate date range for ranged exports
      if (RANGED_EXPORTS.includes(type) && (!from || !to)) {
        return res.status(400).json({ message: 'from and to date are required for this export type' });
      }
      if (MONTHLY_EXPORTS.includes(type) && !billingMonth) {
        return res.status(400).json({ message: 'billingMonth is required for payment export' });
      }

      // Validate village access
      const accessible = await getAccessibleVillages(user, [villageId]);
      if (accessible.length === 0) {
        return res.status(403).json({ message: 'No access to this village' });
      }

      const villageName = await getVillageName(villageId);
      const opts = { villageId, from, to, billingMonth, maskPersonalData: mask };

      const { csvContent, rowCount, fileName } = await generateSingleCsv(type, opts, villageName, mask);

      // Audit log
      await logExportAction(user, req, type, villageId, villageName, from, to, billingMonth, rowCount, fileName, false, false);

      setCsvHeaders(res, fileName);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: 'Export failed' });
    }
  });

  // ─── Bulk export (ZIP) ───
  app.post('/api/export/bulk', ...exportAuth, rateLimitExport, async (req: Request, res: Response) => {
    try {
      const body = bulkExportSchema.parse(req.body);
      const user = {
        userId: req.session.userId!,
        role: req.session.role!,
        villageId: req.session.villageId,
        name: req.session.userId,
      };

      // Validate village access
      const accessibleVillages = await getAccessibleVillages(user, body.villageIds);
      if (accessibleVillages.length === 0) {
        return res.status(403).json({ message: 'No access to requested villages' });
      }

      // Sensitive export check — require password verification already done client-side
      const isSensitive = accessibleVillages.length > 1 || user.role === 'admin';

      const mask = body.maskPersonalData ?? false;
      const dateStr = new Date().toISOString().split('T')[0];
      const singleVillage = accessibleVillages.length === 1;
      const singleExport = body.exports.length === 1;

      // Single village + single export → plain CSV (no ZIP)
      if (singleVillage && singleExport) {
        const villageId = accessibleVillages[0];
        const exp = body.exports[0];
        const villageName = await getVillageName(villageId);
        const opts = { villageId, from: exp.from, to: exp.to, billingMonth: exp.billingMonth };
        const { csvContent, rowCount, fileName } = await generateSingleCsv(exp.type, opts, villageName, mask);

        await logExportAction(user, req, exp.type, villageId, villageName, exp.from, exp.to, exp.billingMonth, rowCount, fileName, false, body.password != null);
        setCsvHeaders(res, fileName);
        res.send(csvContent);
        return;
      }

      // Multi-export or multi-village → ZIP
      const zipFileName = singleVillage
        ? `GreenPath_Export_${(await getVillageName(accessibleVillages[0])).replace(/\s+/g, '_')}_${dateStr}.zip`
        : `GreenPath_Export_${dateStr}.zip`;

      const zipPassword = body.password || null;

      const archive = zipPassword
        ? archiver('zip-encrypted' as any, {
            zlib: { level: 6 },
            encryptionMethod: 'aes256',
            password: zipPassword,
          } as any)
        : archiver('zip', {
            zlib: { level: 6 },
          });

      setZipHeaders(res, zipFileName);
      archive.pipe(res);

      const summaryRows: string[][] = [];

      for (const villageId of accessibleVillages) {
        const villageName = await getVillageName(villageId);
        const folder = accessibleVillages.length > 1 ? `${villageName.replace(/\s+/g, '_')}/` : '';

        for (const exp of body.exports) {
          const opts = { villageId, from: exp.from, to: exp.to, billingMonth: exp.billingMonth };
          const { csvContent, rowCount, fileName } = await generateSingleCsv(exp.type, opts, villageName, mask);

          archive.append(csvContent, { name: `${folder}${fileName}` });

          summaryRows.push([villageName, EXPORT_LABELS[exp.type], String(rowCount), fileName]);

          // Log each export individually
          await logExportAction(user, req, exp.type, villageId, villageName, exp.from, exp.to, exp.billingMonth, rowCount, fileName, true, body.password != null);
        }
      }

      // Add summary sheet if requested
      if (body.includeSummary) {
        const summaryHeaders = ['Field', 'Value'];
        const summaryData = [
          ['Export Date', new Date().toISOString()],
          ['Exported By', `${user.name} (${user.userId})`],
          ['Role', user.role],
          ['Villages', accessibleVillages.join(', ')],
          ['Total Reports', String(summaryRows.length)],
          ['', ''],
          ['Village', 'Report', 'Rows', 'Filename'],
          ...summaryRows,
        ];

        const summaryCsv = CSV_BOM +
          summaryData.map(row => toCsvRow(row)).join('');

        archive.append(summaryCsv, { name: 'GreenPath_ExportSummary.csv' });
      }

      await archive.finalize();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request', errors: error.errors });
      }
      if (!res.headersSent) {
        res.status(500).json({ message: 'Export failed' });
      }
    }
  });

  // ─── Password verification (for sensitive exports) ───
  app.post('/api/export/verify-password', ...exportAuth, async (req: Request, res: Response) => {
    try {
      const user = {
        userId: req.session.userId!,
        role: req.session.role!,
        villageId: req.session.villageId,
      };
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      // Verify against stored password hash
      const bcrypt = await import('bcrypt');
      const { users } = await import('@shared/schema');
      const { db: database } = await import('../../db');
      const { eq } = await import('drizzle-orm');

      const [dbUser] = await database
        .select({ password: users.password })
        .from(users)
        .where(eq(users.userId, user.userId));

      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValid = await bcrypt.compare(password, dbUser.password);
      res.json({ verified: isValid });
    } catch (error: any) {
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // ─── Generate suggested password ───
  app.get('/api/export/suggest-password', ...exportAuth, (_req: Request, res: Response) => {
    res.json({ password: generateSuggestedPassword() });
  });
}

// ═══════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Generate CSV content for a single export type.
 */
async function generateSingleCsv(
  type: string,
  opts: { villageId: string; from?: string; to?: string; billingMonth?: string },
  villageName: string,
  mask: boolean
): Promise<{ csvContent: string; rowCount: number; fileName: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const vName = villageName.replace(/\s+/g, '_');
  let headers: string[];
  let rows: any[][];
  let fileName: string;

  switch (type) {
    case 'households': {
      const data = await getHouseholdsForExport(opts);
      headers = HOUSEHOLD_HEADERS;
      rows = data.map((r, i) => householdToRow(r, i, mask));
      fileName = `GreenPath_Households_${vName}_${dateStr}.csv`;
      break;
    }
    case 'collections': {
      const data = await getCollectionsForExport(opts);
      headers = COLLECTION_HEADERS;
      rows = data.map((r, i) => collectionToRow(r, i, mask));
      fileName = `GreenPath_Collections_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'daily-waste': {
      const data = await getDailyWasteForExport(opts);
      headers = DAILY_WASTE_HEADERS;
      rows = data.map(r => dailyWasteToRow(r));
      fileName = `GreenPath_DailyWaste_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'compost': {
      const data = await getCompostForExport(opts);
      headers = COMPOST_HEADERS;
      rows = data.map(r => compostToRow(r));
      fileName = `GreenPath_Compost_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'sales': {
      const data = await getSalesForExport(opts);
      headers = SALES_HEADERS;
      rows = data.map(r => salesToRow(r));
      fileName = `GreenPath_Sales_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'payments': {
      const data = await getPaymentsForExport(opts);
      headers = PAYMENT_HEADERS;
      rows = data.map((r, i) => paymentToRow(r, i, mask));
      fileName = `GreenPath_Payments_${vName}_${opts.billingMonth}.csv`;
      break;
    }
    case 'collectors': {
      const data = await getCollectorsForExport(opts);
      headers = COLLECTOR_HEADERS;
      rows = data.map(r => collectorToRow(r, mask));
      fileName = `GreenPath_Collectors_${vName}_${dateStr}.csv`;
      break;
    }
    case 'issues': {
      const data = await getIssuesForExport(opts);
      headers = ISSUE_HEADERS;
      rows = data.map(r => issueToRow(r));
      fileName = `GreenPath_Issues_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'coverage': {
      const data = await getCoverageForExport(opts);
      headers = COVERAGE_HEADERS;
      rows = data.map(r => coverageToRow(r));
      fileName = `GreenPath_Coverage_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'ward-daily': {
      const data = await getWardDailyForExport(opts);
      headers = WARD_DAILY_HEADERS;
      rows = data.map(r => wardDailyToRow(r));
      fileName = `GreenPath_WardDaily_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    case 'vehicle-daily': {
      const data = await getVehicleDailyForExport(opts);
      headers = VEHICLE_DAILY_HEADERS;
      rows = data.map(r => vehicleDailyToRow(r));
      fileName = `GreenPath_VehicleDaily_${vName}_${opts.from}_to_${opts.to}.csv`;
      break;
    }
    default:
      throw new Error(`Unknown export type: ${type}`);
  }

  return {
    csvContent: buildCsv(headers, rows),
    rowCount: rows.length,
    fileName,
  };
}

/**
 * Get accessible villages for the user.
 */
async function getAccessibleVillages(user: any, requestedVillageIds: string[]): Promise<string[]> {
  if (user.role === 'admin') {
    // Admin can access all — validate they exist
    const { villages } = await import('@shared/schema');
    const { db: database } = await import('../../db');
    const { inArray } = await import('drizzle-orm');
    const existing = await database
      .select({ villageId: villages.villageId })
      .from(villages)
      .where(inArray(villages.villageId, requestedVillageIds));
    return existing.map(v => v.villageId);
  }

  if (user.role === 'moderator') {
    // Moderator — only assigned villages
    const { moderatorVillageAssignments } = await import('@shared/schema');
    const { db: database } = await import('../../db');
    const { eq, inArray } = await import('drizzle-orm');
    const assignments = await database
      .select({ villageId: moderatorVillageAssignments.villageId })
      .from(moderatorVillageAssignments)
      .where(eq(moderatorVillageAssignments.moderatorId, user.moderatorId || user.userId));
    const assignedIds = new Set(assignments.map(a => a.villageId));
    return requestedVillageIds.filter(id => assignedIds.has(id));
  }

  if (user.role === 'manager') {
    // Manager — only own village
    return requestedVillageIds.filter(id => id === user.villageId);
  }

  return [];
}

/**
 * Log export action to audit trail with forensic fields.
 */
async function logExportAction(
  user: any,
  req: Request,
  exportType: string,
  villageId: string,
  villageName: string,
  from: string | undefined,
  to: string | undefined,
  billingMonth: string | undefined,
  rowCount: number,
  fileName: string,
  isBulk: boolean,
  passwordProtected: boolean
): Promise<void> {
  const dateRange = from && to ? `${from} to ${to}` : billingMonth || null;

  await logAction(
    villageId,
    user.userId,
    'downloaded',
    'csv_export',
    exportType,
    {
      exportType,
      villageId,
      villageName,
      dateRange,
      rowCount,
      estimatedSizeKB: Math.round((rowCount * AVG_BYTES_PER_ROW) / 1024),
      fileName,
      dataSensitivity: EXPORT_SENSITIVITY[exportType],
      isBulk,
      passwordProtected,
      ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      sessionId: (req as any).sessionID || 'unknown',
    }
  );
}
