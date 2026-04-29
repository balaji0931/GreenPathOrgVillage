/**
 * Export Storage - Database queries for CSV export.
 * 11 export types + estimate queries.
 * All queries are village-scoped and date-filtered.
 */
import { db } from '../../db';
import {
  households, collectors, wasteCollections, issues,
  dailyWasteLog, compostProductionLog, dryWasteSales, dryWasteSaleMaterials,
  householdMonthlyBills, dailyVillageStats, dailyWardStats, dailyVehicleStats,
} from '@shared/schema';
import { eq, and, gte, lte, count, sql, desc, asc, inArray } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════════
// Estimate Queries (fast COUNTs - no data returned)
// ═══════════════════════════════════════════════════════════════

export async function estimateExport(
  villageId: string,
  exportType: string,
  from?: string,
  to?: string,
  billingMonth?: string
): Promise<number> {
  switch (exportType) {
    case 'households':
      return estimateCount(households, eq(households.villageId, villageId));
    case 'collections':
      return estimateCollections(villageId, from!, to!);
    case 'daily-waste':
      return estimateCount(dailyWasteLog, and(eq(dailyWasteLog.villageId, villageId), gte(dailyWasteLog.date, from!), lte(dailyWasteLog.date, to!)));
    case 'compost':
      return estimateCount(compostProductionLog, and(eq(compostProductionLog.villageId, villageId), gte(compostProductionLog.date, from!), lte(compostProductionLog.date, to!)));
    case 'sales':
      return estimateSales(villageId, from!, to!);
    case 'payments':
      return estimateCount(householdMonthlyBills, and(eq(householdMonthlyBills.villageId, villageId), eq(householdMonthlyBills.billingMonth, billingMonth!)));
    case 'collectors':
      return estimateCount(collectors, eq(collectors.villageId, villageId));
    case 'issues':
      return estimateIssues(villageId, from!, to!);
    case 'coverage':
      return estimateCount(dailyVillageStats, and(eq(dailyVillageStats.villageId, villageId), gte(dailyVillageStats.reportDate, from!), lte(dailyVillageStats.reportDate, to!)));
    case 'ward-daily':
      return estimateCount(dailyWardStats, and(eq(dailyWardStats.villageId, villageId), gte(dailyWardStats.reportDate, from!), lte(dailyWardStats.reportDate, to!)));
    case 'vehicle-daily':
      return estimateCount(dailyVehicleStats, and(eq(dailyVehicleStats.villageId, villageId), gte(dailyVehicleStats.reportDate, from!), lte(dailyVehicleStats.reportDate, to!)));
    default:
      return 0;
  }
}

async function estimateCount(table: any, where: any): Promise<number> {
  const [result] = await db.select({ count: count() }).from(table).where(where);
  return result?.count ?? 0;
}

async function estimateCollections(villageId: string, from: string, to: string): Promise<number> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const [result] = await db
    .select({ count: count() })
    .from(wasteCollections)
    .innerJoin(households, eq(wasteCollections.householdId, households.id))
    .where(and(
      eq(households.villageId, villageId),
      gte(wasteCollections.collectionDate, fromDate),
      lte(wasteCollections.collectionDate, toDate)
    ));
  return result?.count ?? 0;
}

async function estimateSales(villageId: string, from: string, to: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(dryWasteSaleMaterials)
    .innerJoin(dryWasteSales, eq(dryWasteSaleMaterials.saleId, dryWasteSales.id))
    .where(and(
      eq(dryWasteSales.villageId, villageId),
      gte(dryWasteSales.saleDate, from),
      lte(dryWasteSales.saleDate, to)
    ));
  return result?.count ?? 0;
}

async function estimateIssues(villageId: string, from: string, to: string): Promise<number> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const [result] = await db
    .select({ count: count() })
    .from(issues)
    .where(and(
      eq(issues.villageId, villageId),
      gte(issues.createdAt, fromDate),
      lte(issues.createdAt, toDate)
    ));
  return result?.count ?? 0;
}

// ═══════════════════════════════════════════════════════════════
// Data Queries - return flat rows ready for CSV
// ═══════════════════════════════════════════════════════════════

interface ExportOptions {
  villageId: string;
  from?: string;
  to?: string;
  billingMonth?: string;
  maskPersonalData?: boolean;
}

// 1. Households
export async function getHouseholdsForExport(opts: ExportOptions) {
  const rows = await db
    .select({
      uid: households.uid,
      headName: households.headName,
      phone: households.phone,
      houseNumber: households.houseNumber,
      ward: households.ward,
      familySize: households.familySize,
      address: households.address,
      status: households.status,
      householdType: households.householdType,
      qrPrinted: households.qrPrinted,
      latitude: households.latitude,
      longitude: households.longitude,
      createdAt: households.createdAt,
    })
    .from(households)
    .where(eq(households.villageId, opts.villageId))
    .orderBy(asc(households.uid));

  return rows;
}

export const HOUSEHOLD_HEADERS = [
  'Sr. No.', 'Household UID', 'Head Name', 'Phone', 'House Number',
  'Ward', 'Family Size', 'Address', 'Status', 'Household Type',
  'QR Printed', 'GPS (Lat)', 'GPS (Lon)', 'Registered On'
];

export function householdToRow(row: any, index: number, mask: boolean): any[] {
  return [
    index + 1,
    row.uid,
    row.headName,
    mask ? maskPhone(row.phone) : row.phone,
    row.houseNumber,
    row.ward,
    row.familySize,
    mask ? (row.ward || '') : row.address,
    row.status,
    row.householdType,
    row.qrPrinted ? 'Yes' : 'No',
    row.latitude,
    row.longitude,
    row.createdAt ? formatDate(row.createdAt) : '',
  ];
}

// 2. Collections
export async function getCollectionsForExport(opts: ExportOptions) {
  const fromDate = new Date(opts.from!);
  const toDate = new Date(opts.to!);
  toDate.setHours(23, 59, 59, 999);

  return db
    .select({
      collectionDate: wasteCollections.collectionDate,
      householdUid: households.uid,
      headName: households.headName,
      ward: households.ward,
      collectorName: collectors.name,
      status: wasteCollections.status,
      wasteTypes: wasteCollections.wasteTypes,
      segregationRating: wasteCollections.segregationRating,
      weightKg: wasteCollections.weightKg,
      missedReason: wasteCollections.missedReason,
      remarks: wasteCollections.remarks,
    })
    .from(wasteCollections)
    .innerJoin(households, eq(wasteCollections.householdId, households.id))
    .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
    .where(and(
      eq(households.villageId, opts.villageId),
      gte(wasteCollections.collectionDate, fromDate),
      lte(wasteCollections.collectionDate, toDate)
    ))
    .orderBy(asc(wasteCollections.collectionDate));
}

export const COLLECTION_HEADERS = [
  'Sr. No.', 'Collection Date', 'Household UID', 'Head Name', 'Ward',
  'Collector Name', 'Status', 'Waste Types', 'Segregation Rating',
  'Weight (kg)', 'Missed Reason', 'Remarks'
];

export function collectionToRow(row: any, index: number, mask: boolean): any[] {
  return [
    index + 1,
    row.collectionDate ? formatDate(row.collectionDate) : '',
    row.householdUid,
    mask ? '***' : row.headName,
    row.ward,
    row.collectorName,
    row.status,
    Array.isArray(row.wasteTypes) ? row.wasteTypes.join(', ') : row.wasteTypes,
    row.segregationRating,
    row.weightKg,
    row.missedReason,
    row.remarks,
  ];
}

// 3. Daily Waste Quantity
export async function getDailyWasteForExport(opts: ExportOptions) {
  return db
    .select()
    .from(dailyWasteLog)
    .where(and(
      eq(dailyWasteLog.villageId, opts.villageId),
      gte(dailyWasteLog.date, opts.from!),
      lte(dailyWasteLog.date, opts.to!)
    ))
    .orderBy(asc(dailyWasteLog.date));
}

export const DAILY_WASTE_HEADERS = [
  'Date', 'Wet Waste (kg)', 'Dry Waste (kg)', 'Sanitary Waste (kg)',
  'Special Care (kg)', 'Mixed Waste (kg)', 'Total (kg)', 'Remarks', 'Logged By'
];

export function dailyWasteToRow(row: any): any[] {
  const wet = Number(row.wetWasteKg) || 0;
  const dry = Number(row.dryWasteKg) || 0;
  const sanitary = Number(row.sanitaryWasteKg) || 0;
  const special = Number(row.specialCareWasteKg) || 0;
  const mixed = Number(row.mixedWasteKg) || 0;
  return [
    row.date,
    wet, dry, sanitary, special, mixed,
    (wet + dry + sanitary + special + mixed).toFixed(2),
    row.remarks,
    row.createdBy,
  ];
}

// 4. Compost Production
export async function getCompostForExport(opts: ExportOptions) {
  return db
    .select()
    .from(compostProductionLog)
    .where(and(
      eq(compostProductionLog.villageId, opts.villageId),
      gte(compostProductionLog.date, opts.from!),
      lte(compostProductionLog.date, opts.to!)
    ))
    .orderBy(asc(compostProductionLog.date));
}

export const COMPOST_HEADERS = ['Date', 'Quantity (kg)', 'Quality', 'Remarks', 'Logged By'];

export function compostToRow(row: any): any[] {
  return [row.date, row.quantityKg, row.compostStatus, row.remarks, row.createdBy];
}

// 5. Dry Waste Sales
export async function getSalesForExport(opts: ExportOptions) {
  return db
    .select({
      saleDate: dryWasteSales.saleDate,
      materialType: dryWasteSaleMaterials.materialType,
      quantityKg: dryWasteSaleMaterials.quantityKg,
      ratePerKg: dryWasteSaleMaterials.ratePerKg,
      amount: dryWasteSaleMaterials.amount,
      totalAmount: dryWasteSales.totalAmount,
      remarks: dryWasteSales.remarks,
      createdBy: dryWasteSales.createdBy,
    })
    .from(dryWasteSaleMaterials)
    .innerJoin(dryWasteSales, eq(dryWasteSaleMaterials.saleId, dryWasteSales.id))
    .where(and(
      eq(dryWasteSales.villageId, opts.villageId),
      gte(dryWasteSales.saleDate, opts.from!),
      lte(dryWasteSales.saleDate, opts.to!)
    ))
    .orderBy(asc(dryWasteSales.saleDate));
}

export const SALES_HEADERS = [
  'Sale Date', 'Material Type', 'Quantity (kg)', 'Rate (₹/kg)',
  'Amount (₹)', 'Sale Total (₹)', 'Remarks', 'Logged By'
];

export function salesToRow(row: any): any[] {
  return [
    row.saleDate, row.materialType, row.quantityKg, row.ratePerKg,
    row.amount, row.totalAmount, row.remarks, row.createdBy
  ];
}

// 6. Payment Ledger
export async function getPaymentsForExport(opts: ExportOptions) {
  return db
    .select({
      householdUid: households.uid,
      headName: households.headName,
      ward: households.ward,
      phone: households.phone,
      householdTypeSnapshot: householdMonthlyBills.householdTypeSnapshot,
      feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
      status: householdMonthlyBills.status,
      paymentMethod: householdMonthlyBills.paymentMethod,
      paidAt: householdMonthlyBills.paidAt,
      receiptNumber: householdMonthlyBills.receiptNumber,
      waivedReason: householdMonthlyBills.waivedReason,
    })
    .from(householdMonthlyBills)
    .innerJoin(households, eq(householdMonthlyBills.householdId, households.id))
    .where(and(
      eq(householdMonthlyBills.villageId, opts.villageId),
      eq(householdMonthlyBills.billingMonth, opts.billingMonth!)
    ))
    .orderBy(asc(households.uid));
}

export const PAYMENT_HEADERS = [
  'Sr. No.', 'Household UID', 'Head Name', 'Ward', 'Household Type',
  'Fee (₹)', 'Status', 'Payment Method', 'Paid At', 'Receipt No.', 'Waiver Reason'
];

export function paymentToRow(row: any, index: number, mask: boolean): any[] {
  return [
    index + 1,
    row.householdUid,
    mask ? '***' : row.headName,
    row.ward,
    row.householdTypeSnapshot,
    row.feeAmountSnapshot,
    row.status,
    row.paymentMethod,
    row.paidAt ? formatDate(row.paidAt) : '',
    row.receiptNumber,
    row.waivedReason,
  ];
}

// 7. Collector Performance
export async function getCollectorsForExport(opts: ExportOptions) {
  const collectorRows = await db
    .select({
      uid: collectors.uid,
      name: collectors.name,
      phone: collectors.phone,
      assignedVehicle: collectors.assignedVehicle,
      createdAt: collectors.createdAt,
    })
    .from(collectors)
    .where(eq(collectors.villageId, opts.villageId))
    .orderBy(asc(collectors.uid));

  // Get collection stats per collector
  const statsResult = await db
    .select({
      collectorId: wasteCollections.collectorId,
      totalCollections: count(),
      avgRating: sql<number>`COALESCE(AVG(${wasteCollections.segregationRating}), 0)`,
    })
    .from(wasteCollections)
    .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
    .where(eq(collectors.villageId, opts.villageId))
    .groupBy(wasteCollections.collectorId);

  const statsMap = new Map(statsResult.map(s => [s.collectorId, s]));

  // Get collector id mapping
  const collectorIds = await db
    .select({ id: collectors.id, uid: collectors.uid })
    .from(collectors)
    .where(eq(collectors.villageId, opts.villageId));
  const idMap = new Map(collectorIds.map(c => [c.uid, c.id]));

  return collectorRows.map(c => {
    const cId = idMap.get(c.uid);
    const stats = cId ? statsMap.get(cId) : null;
    return {
      ...c,
      totalCollections: stats?.totalCollections ?? 0,
      avgRating: stats?.avgRating ? Number(stats.avgRating).toFixed(1) : '0.0',
    };
  });
}

export const COLLECTOR_HEADERS = [
  'Collector UID', 'Name', 'Phone', 'Assigned Vehicle',
  'Total Collections', 'Avg Segregation Rating', 'Registered On'
];

export function collectorToRow(row: any, mask: boolean): any[] {
  return [
    row.uid,
    row.name,
    mask ? maskPhone(row.phone) : row.phone,
    row.assignedVehicle,
    row.totalCollections,
    row.avgRating,
    row.createdAt ? formatDate(row.createdAt) : '',
  ];
}

// 8. Issues
export async function getIssuesForExport(opts: ExportOptions) {
  const fromDate = new Date(opts.from!);
  const toDate = new Date(opts.to!);
  toDate.setHours(23, 59, 59, 999);

  return db
    .select({
      id: issues.id,
      title: issues.title,
      category: issues.category,
      reportedBy: issues.reportedBy,
      status: issues.status,
      description: issues.description,
      managerReply: issues.managerReply,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
    })
    .from(issues)
    .where(and(
      eq(issues.villageId, opts.villageId),
      gte(issues.createdAt, fromDate),
      lte(issues.createdAt, toDate)
    ))
    .orderBy(desc(issues.createdAt));
}

export const ISSUE_HEADERS = [
  'Issue #', 'Title', 'Category', 'Reported By', 'Status',
  'Description', 'Manager Reply', 'Created', 'Updated'
];

export function issueToRow(row: any): any[] {
  return [
    row.id, row.title, row.category, row.reportedBy, row.status,
    row.description, row.managerReply,
    row.createdAt ? formatDate(row.createdAt) : '',
    row.updatedAt ? formatDate(row.updatedAt) : '',
  ];
}

// 9. Coverage & Segregation Summary (from dailyVillageStats)
export async function getCoverageForExport(opts: ExportOptions) {
  const stats = await db
    .select()
    .from(dailyVillageStats)
    .where(and(
      eq(dailyVillageStats.villageId, opts.villageId),
      gte(dailyVillageStats.reportDate, opts.from!),
      lte(dailyVillageStats.reportDate, opts.to!)
    ))
    .orderBy(asc(dailyVillageStats.reportDate));

  // Get issue counts per date (lightweight - just counts)
  const fromDate = new Date(opts.from!);
  const toDate = new Date(opts.to!);
  toDate.setHours(23, 59, 59, 999);

  const issueCountsRaw = await db
    .select({
      date: sql<string>`DATE(${issues.createdAt})`,
      count: count(),
    })
    .from(issues)
    .where(and(
      eq(issues.villageId, opts.villageId),
      gte(issues.createdAt, fromDate),
      lte(issues.createdAt, toDate)
    ))
    .groupBy(sql`DATE(${issues.createdAt})`);

  const issueMap = new Map(issueCountsRaw.map(i => [i.date, i.count]));

  return stats.map(s => ({
    ...s,
    issuesCount: issueMap.get(s.reportDate) ?? 0,
  }));
}

export const COVERAGE_HEADERS = [
  'Date', 'Total Households', 'Households Served', 'Coverage %',
  'Segregation Sum', 'Avg Segregation Score', 'Missed Households', 'Issues Reported'
];

export function coverageToRow(row: any): any[] {
  const total = row.totalHouseholds || 0;
  const collected = row.collectedCount || 0;
  const coverage = total > 0 ? ((collected / total) * 100).toFixed(1) : '0.0';
  const avgSeg = collected > 0 ? (Number(row.segregationSum) / collected).toFixed(1) : '0.0';
  return [
    row.reportDate, total, collected, coverage + '%',
    row.segregationSum, avgSeg, total - collected, row.issuesCount,
  ];
}

// 10. Ward-Level Daily Report
export async function getWardDailyForExport(opts: ExportOptions) {
  return db
    .select()
    .from(dailyWardStats)
    .where(and(
      eq(dailyWardStats.villageId, opts.villageId),
      gte(dailyWardStats.reportDate, opts.from!),
      lte(dailyWardStats.reportDate, opts.to!)
    ))
    .orderBy(asc(dailyWardStats.reportDate), asc(dailyWardStats.wardName));
}

export const WARD_DAILY_HEADERS = [
  'Date', 'Ward', 'Total Households', 'Collected', 'Coverage %', 'Missed'
];

export function wardDailyToRow(row: any): any[] {
  const total = row.totalHouseholds || 0;
  const collected = row.collectedCount || 0;
  const coverage = total > 0 ? ((collected / total) * 100).toFixed(1) : '0.0';
  return [row.reportDate, row.wardName, total, collected, coverage + '%', total - collected];
}

// 11. Vehicle Daily Report
export async function getVehicleDailyForExport(opts: ExportOptions) {
  return db
    .select()
    .from(dailyVehicleStats)
    .where(and(
      eq(dailyVehicleStats.villageId, opts.villageId),
      gte(dailyVehicleStats.reportDate, opts.from!),
      lte(dailyVehicleStats.reportDate, opts.to!)
    ))
    .orderBy(asc(dailyVehicleStats.reportDate), asc(dailyVehicleStats.registrationNumber));
}

export const VEHICLE_DAILY_HEADERS = [
  'Date', 'Vehicle Reg', 'Vehicle Name', 'Collectors',
  'Collections', 'First Collection', 'Last Collection'
];

export function vehicleDailyToRow(row: any): any[] {
  return [
    row.reportDate, row.registrationNumber, row.vehicleName,
    row.collectorNames, row.collectedCount,
    row.firstCollectionAt ? formatTime(row.firstCollectionAt) : '',
    row.lastCollectionAt ? formatTime(row.lastCollectionAt) : '',
  ];
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}

function formatTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  const hours = istDate.getUTCHours();
  const mins = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mins} ${ampm}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 3) return phone;
  return '•'.repeat(phone.length - 3) + phone.slice(-3);
}

/**
 * Get village name for filename.
 */
export async function getVillageName(villageId: string): Promise<string> {
  const { villages } = await import('@shared/schema');
  const [village] = await db
    .select({ name: villages.name })
    .from(villages)
    .where(eq(villages.villageId, villageId));
  return village?.name || villageId;
}
