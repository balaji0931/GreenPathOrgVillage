import { db } from "../../db";
import { eq, and, sql, count, sum, desc, lt, inArray, like } from "drizzle-orm";
import {
  households,
  householdTypes,
  villageMonthFeeConfig,
  billingCycles,
  householdMonthlyBills,
  villagePaymentGatewayConfig,
  paymentGatewayOrders,
  paymentGatewayEvents,
  paymentAuditLog,
  receiptCounters,
} from "@shared/schema";
import { encryptConfig, hashConfig } from "../../utils/crypto";
import { AUDIT_ACTIONS } from "@shared/payment.constants";

// ═══════════════════════════════════════════
// Household Types
// ═══════════════════════════════════════════

const DEFAULT_HOUSEHOLD_TYPES = [
  { typeCode: "residential_small", displayName: "Residential (Small)", description: "1-4 members, small house", sortOrder: 1 },
  { typeCode: "residential_large", displayName: "Residential (Large)", description: "5+ members, large house", sortOrder: 2 },
  { typeCode: "commercial_shop", displayName: "Commercial (Shop)", description: "Shops, restaurants, offices", sortOrder: 3 },
  { typeCode: "bulk_generator", displayName: "Bulk Generator", description: "Hotels, marriage halls, markets", sortOrder: 4 },
  { typeCode: "institutional", displayName: "Institutional", description: "Schools, temples, community halls", sortOrder: 5 },
  { typeCode: "slum_supported", displayName: "Subsidized", description: "BPL/slum households, reduced fee", sortOrder: 6 },
];

export async function getHouseholdTypesByVillage(villageId: string) {
  return db.select({
    id: householdTypes.id,
    villageId: householdTypes.villageId,
    typeCode: householdTypes.typeCode,
    displayName: householdTypes.displayName,
    description: householdTypes.description,
    isActive: householdTypes.isActive,
    sortOrder: householdTypes.sortOrder,
    createdAt: householdTypes.createdAt,
  }).from(householdTypes)
    .where(eq(householdTypes.villageId, villageId))
    .orderBy(householdTypes.sortOrder);
}

export async function seedDefaultHouseholdTypes(villageId: string) {
  const existing = await getHouseholdTypesByVillage(villageId);
  if (existing.length > 0) return existing;

  const values = DEFAULT_HOUSEHOLD_TYPES.map(t => ({
    villageId,
    ...t,
  }));

  await db.insert(householdTypes).values(values);
  return getHouseholdTypesByVillage(villageId);
}

export async function upsertHouseholdType(data: {
  villageId: string;
  typeCode: string;
  displayName: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const existing = await db.select({
    id: householdTypes.id,
    villageId: householdTypes.villageId,
    typeCode: householdTypes.typeCode,
    displayName: householdTypes.displayName,
    description: householdTypes.description,
    isActive: householdTypes.isActive,
    sortOrder: householdTypes.sortOrder,
    createdAt: householdTypes.createdAt,
  }).from(householdTypes)
    .where(and(
      eq(householdTypes.villageId, data.villageId),
      eq(householdTypes.typeCode, data.typeCode),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(householdTypes)
      .set({
        displayName: data.displayName,
        description: data.description,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .where(eq(householdTypes.id, existing[0].id));
    return { ...existing[0], ...data };
  }

  const [inserted] = await db.insert(householdTypes).values(data).returning();
  return inserted;
}

// ═══════════════════════════════════════════
// Fee Config
// ═══════════════════════════════════════════

export async function getFeeConfigByVillage(villageId: string) {
  return db.select({
    id: villageMonthFeeConfig.id,
    villageId: villageMonthFeeConfig.villageId,
    householdTypeCode: villageMonthFeeConfig.householdTypeCode,
    feeAmount: villageMonthFeeConfig.feeAmount,
    isWaivedCategory: villageMonthFeeConfig.isWaivedCategory,
    createdBy: villageMonthFeeConfig.createdBy,
    updatedAt: villageMonthFeeConfig.updatedAt,
  }).from(villageMonthFeeConfig)
    .where(eq(villageMonthFeeConfig.villageId, villageId));
}

export async function upsertFeeConfig(data: {
  villageId: string;
  householdTypeCode: string;
  feeAmount: string;
  isWaivedCategory?: boolean;
  createdBy: string;
}) {
  await db.insert(villageMonthFeeConfig)
    .values(data)
    .onConflictDoUpdate({
      target: [villageMonthFeeConfig.villageId, villageMonthFeeConfig.householdTypeCode],
      set: {
        feeAmount: data.feeAmount,
        isWaivedCategory: data.isWaivedCategory ?? false,
        createdBy: data.createdBy,
        updatedAt: new Date(),
      },
    });
}

export async function saveFeeConfigBulk(villageId: string, createdBy: string, configs: {
  householdTypeCode: string;
  feeAmount: string;
  isWaivedCategory?: boolean;
}[]) {
  for (const config of configs) {
    await upsertFeeConfig({
      villageId,
      createdBy,
      ...config,
    });
  }
  return getFeeConfigByVillage(villageId);
}

// ═══════════════════════════════════════════
// Billing Cycles
// ═══════════════════════════════════════════

export async function getCycleByVillageMonth(villageId: string, billingMonth: string) {
  const [cycle] = await db.select({
    id: billingCycles.id,
    villageId: billingCycles.villageId,
    billingMonth: billingCycles.billingMonth,
    status: billingCycles.status,
    totalBillsGenerated: billingCycles.totalBillsGenerated,
    totalExpectedRevenue: billingCycles.totalExpectedRevenue,
    totalWaivedHouseholds: billingCycles.totalWaivedHouseholds,
    feeConfigSnapshot: billingCycles.feeConfigSnapshot,
    gatewayConfigSnapshot: billingCycles.gatewayConfigSnapshot,
    activatedBy: billingCycles.activatedBy,
    createdAt: billingCycles.createdAt,
  }).from(billingCycles)
    .where(and(
      eq(billingCycles.villageId, villageId),
      eq(billingCycles.billingMonth, billingMonth),
    ))
    .limit(1);
  return cycle || null;
}

export async function getCyclesByVillage(villageId: string) {
  return db.select({
    id: billingCycles.id,
    villageId: billingCycles.villageId,
    billingMonth: billingCycles.billingMonth,
    status: billingCycles.status,
    totalBillsGenerated: billingCycles.totalBillsGenerated,
    totalExpectedRevenue: billingCycles.totalExpectedRevenue,
    totalWaivedHouseholds: billingCycles.totalWaivedHouseholds,
    feeConfigSnapshot: billingCycles.feeConfigSnapshot,
    gatewayConfigSnapshot: billingCycles.gatewayConfigSnapshot,
    activatedBy: billingCycles.activatedBy,
    createdAt: billingCycles.createdAt,
  }).from(billingCycles)
    .where(eq(billingCycles.villageId, villageId))
    .orderBy(desc(billingCycles.billingMonth));
}

export async function getActivationPreview(villageId: string) {
  // Get fee config
  const feeConfig = await getFeeConfigByVillage(villageId);
  const types = await getHouseholdTypesByVillage(villageId);

  // Count active households per type
  const householdCounts = await db.select({
    householdType: households.householdType,
    count: count(),
  })
    .from(households)
    .where(and(
      eq(households.villageId, villageId),
      eq(households.status, "active"),
    ))
    .groupBy(households.householdType);

  // Get gateway config
  const gatewayConfig = await getGatewayConfig(villageId);

  // Build preview
  const typeMap = new Map(types.map(t => [t.typeCode, t]));
  const feeMap = new Map(feeConfig.map(f => [f.householdTypeCode, f]));
  const countMap = new Map(householdCounts.map(c => [c.householdType, Number(c.count)]));

  let totalExpectedRevenue = 0;
  let totalBillable = 0;
  let totalWaived = 0;

  const breakdown = types.filter(t => t.isActive).map(type => {
    const fee = feeMap.get(type.typeCode);
    const hhCount = countMap.get(type.typeCode) || 0;
    const feeAmount = parseFloat(fee?.feeAmount || "0");
    const isWaived = fee?.isWaivedCategory || false;

    if (isWaived) {
      totalWaived += hhCount;
    } else {
      totalExpectedRevenue += feeAmount * hhCount;
      totalBillable += hhCount;
    }

    return {
      typeCode: type.typeCode,
      displayName: type.displayName,
      feeAmount: fee?.feeAmount || "0",
      isWaived,
      householdCount: hhCount,
    };
  });

  // Count unclassified (households with type not matching any active type)
  const allActiveTypes = new Set(types.filter(t => t.isActive).map(t => t.typeCode));
  let unclassifiedCount = 0;
  for (const entry of Array.from(countMap.entries())) {
    if (!allActiveTypes.has(entry[0] || "residential_small")) {
      unclassifiedCount += entry[1];
    }
  }

  return {
    breakdown,
    totalBillable,
    totalWaived,
    totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
    unclassifiedCount,
    hasFeeConfig: feeConfig.length > 0,
    gatewayStatus: gatewayConfig ? {
      provider: gatewayConfig.provider,
      isActive: gatewayConfig.isActive,
      mdrPolicy: gatewayConfig.mdrPolicy,
      isTestMode: gatewayConfig.isTestMode,
      lastVerifiedAt: gatewayConfig.lastVerifiedAt,
      lastTestStatus: gatewayConfig.lastTestStatus,
    } : null,
  };
}

export async function activateBillingCycle(villageId: string, billingMonth: string, activatedBy: string) {
  // Check no existing cycle
  const existing = await getCycleByVillageMonth(villageId, billingMonth);
  if (existing) {
    throw new Error(`Billing cycle for ${billingMonth} already exists`);
  }

  // Get fee config + types
  const feeConfig = await getFeeConfigByVillage(villageId);
  if (feeConfig.length === 0) {
    throw new Error("No fee policy configured. Please set up fees first.");
  }

  const types = await getHouseholdTypesByVillage(villageId);
  const feeMap = new Map(feeConfig.map(f => [f.householdTypeCode, f]));
  const typeMap = new Map(types.map(t => [t.typeCode, t]));

  // Get gateway config for snapshot
  const gatewayConfig = await getGatewayConfig(villageId);

  // Get all active households
  const activeHouseholds = await db.select({
    id: households.id,
    householdType: households.householdType,
    villageId: households.villageId,
  }).from(households)
    .where(and(
      eq(households.villageId, villageId),
      eq(households.status, "active"),
    ));

  // Count per type for snapshot
  const typeCountMap = new Map<string, number>();
  for (const hh of activeHouseholds) {
    const type = hh.householdType || "residential_small";
    typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
  }

  // Build snapshot
  const feeConfigSnapshot = types.filter(t => t.isActive).map(t => {
    const fee = feeMap.get(t.typeCode);
    return {
      typeCode: t.typeCode,
      displayName: t.displayName,
      feeAmount: fee?.feeAmount || "0",
      isWaived: fee?.isWaivedCategory || false,
      householdCount: typeCountMap.get(t.typeCode) || 0,
    };
  });

  const gatewayConfigSnapshot = gatewayConfig ? {
    provider: gatewayConfig.provider,
    configVersionHash: gatewayConfig.encryptedConfigJson ? hashConfig(gatewayConfig.encryptedConfigJson) : "none",
    merchantLabel: "Village Gateway",
    isTestMode: gatewayConfig.isTestMode || false,
    mdrPolicy: gatewayConfig.mdrPolicy || "village_absorbs",
  } : null;

  // Generate bills in a transaction
  let totalBillsGenerated = 0;
  let totalExpectedRevenue = 0;
  let totalWaivedHouseholds = 0;

  const [cycle] = await db.insert(billingCycles).values({
    villageId,
    billingMonth,
    activatedBy,
    feeConfigSnapshot,
    gatewayConfigSnapshot,
    totalBillsGenerated: 0,
    totalExpectedRevenue: "0",
    totalWaivedHouseholds: 0,
  }).returning();

  // Insert bills
  const billValues = activeHouseholds.map(hh => {
    const hhType = hh.householdType || "residential_small";
    const fee = feeMap.get(hhType);
    const feeAmount = fee?.feeAmount || "0";
    const isWaived = fee?.isWaivedCategory || false;

    if (isWaived) {
      totalWaivedHouseholds++;
    } else {
      totalExpectedRevenue += parseFloat(feeAmount);
      totalBillsGenerated++;
    }

    return {
      householdId: hh.id,
      villageId,
      billingMonth,
      cycleId: cycle.id,
      householdTypeSnapshot: hhType,
      feeAmountSnapshot: feeAmount,
      status: isWaived ? "waived" as const : "unpaid" as const,
      waivedReason: isWaived ? "Waived category" : undefined,
      waivedBy: isWaived ? "system" : undefined,
    };
  });

  // Batch insert in chunks of 500 to avoid parameter limits
  const CHUNK_SIZE = 500;
  for (let i = 0; i < billValues.length; i += CHUNK_SIZE) {
    const chunk = billValues.slice(i, i + CHUNK_SIZE);
    await db.insert(householdMonthlyBills).values(chunk);
  }

  // Update cycle with totals
  await db.update(billingCycles)
    .set({
      totalBillsGenerated,
      totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
      totalWaivedHouseholds,
    })
    .where(eq(billingCycles.id, cycle.id));

  return {
    cycleId: cycle.id,
    billingMonth,
    totalBillsGenerated,
    totalWaivedHouseholds,
    totalExpectedRevenue: totalExpectedRevenue.toFixed(2),
    totalHouseholds: activeHouseholds.length,
  };
}

// ═══════════════════════════════════════════
// Bills
// ═══════════════════════════════════════════

export async function getBillsByVillageMonth(villageId: string, billingMonth: string, filters?: {
  status?: string;
  ward?: string;
  householdType?: string;
}) {
  const bills = await db.select({
    bill: householdMonthlyBills,
    headName: households.headName,
    houseNumber: households.houseNumber,
    ward: households.ward,
    phone: households.phone,
    uid: households.uid,
  })
    .from(householdMonthlyBills)
    .innerJoin(households, eq(householdMonthlyBills.householdId, households.id))
    .where(and(
      eq(householdMonthlyBills.villageId, villageId),
      eq(householdMonthlyBills.billingMonth, billingMonth),
      filters?.status ? eq(householdMonthlyBills.status, filters.status) : undefined,
      filters?.ward ? eq(households.ward, filters.ward) : undefined,
      filters?.householdType ? eq(householdMonthlyBills.householdTypeSnapshot, filters.householdType) : undefined,
    ))
    .orderBy(households.houseNumber);

  return bills.map(row => ({
    ...row.bill,
    headName: row.headName,
    houseNumber: row.houseNumber,
    ward: row.ward,
    phone: row.phone,
    householdUid: row.uid,
  }));
}

export async function getBillsByHousehold(householdId: number) {
  return db.select({
    id: householdMonthlyBills.id,
    householdId: householdMonthlyBills.householdId,
    villageId: householdMonthlyBills.villageId,
    billingMonth: householdMonthlyBills.billingMonth,
    cycleId: householdMonthlyBills.cycleId,
    householdTypeSnapshot: householdMonthlyBills.householdTypeSnapshot,
    feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
    status: householdMonthlyBills.status,
    paidAt: householdMonthlyBills.paidAt,
    paymentMethod: householdMonthlyBills.paymentMethod,
    gatewayTxnId: householdMonthlyBills.gatewayTxnId,
    receivedByUserId: householdMonthlyBills.receivedByUserId,
    receiptNumber: householdMonthlyBills.receiptNumber,
    waivedReason: householdMonthlyBills.waivedReason,
    waivedBy: householdMonthlyBills.waivedBy,
    isLockedForPayment: householdMonthlyBills.isLockedForPayment,
  }).from(householdMonthlyBills)
    .where(eq(householdMonthlyBills.householdId, householdId))
    .orderBy(desc(householdMonthlyBills.billingMonth));
}

export async function getBillById(billId: number) {
  const [bill] = await db.select({
    id: householdMonthlyBills.id,
    householdId: householdMonthlyBills.householdId,
    villageId: householdMonthlyBills.villageId,
    billingMonth: householdMonthlyBills.billingMonth,
    cycleId: householdMonthlyBills.cycleId,
    householdTypeSnapshot: householdMonthlyBills.householdTypeSnapshot,
    feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
    status: householdMonthlyBills.status,
    paidAt: householdMonthlyBills.paidAt,
    paymentMethod: householdMonthlyBills.paymentMethod,
    gatewayTxnId: householdMonthlyBills.gatewayTxnId,
    receivedByUserId: householdMonthlyBills.receivedByUserId,
    receiptNumber: householdMonthlyBills.receiptNumber,
    waivedReason: householdMonthlyBills.waivedReason,
    waivedBy: householdMonthlyBills.waivedBy,
    isLockedForPayment: householdMonthlyBills.isLockedForPayment,
  }).from(householdMonthlyBills)
    .where(eq(householdMonthlyBills.id, billId))
    .limit(1);
  return bill || null;
}

export async function addIndividualBill(data: {
  householdId: number;
  villageId: string;
  billingMonth: string;
  cycleId: number;
  householdTypeSnapshot: string;
  feeAmountSnapshot: string;
}) {
  const [bill] = await db.insert(householdMonthlyBills)
    .values({ ...data, status: "unpaid" })
    .returning();
  return bill;
}

// ═══════════════════════════════════════════
// Receipt Counters (concurrency-safe)
// ═══════════════════════════════════════════

async function getNextReceiptNumber(villageId: string, billingMonth: string): Promise<string> {
  // Atomic increment — safe under concurrent payments
  const result = await db.insert(receiptCounters)
    .values({ villageId, billingMonth, lastSequence: 1 })
    .onConflictDoUpdate({
      target: [receiptCounters.villageId, receiptCounters.billingMonth],
      set: { lastSequence: sql`${receiptCounters.lastSequence} + 1` },
    })
    .returning();

  const seq = result[0].lastSequence || 1;
  const monthPart = billingMonth.replace("-", "");
  return `GR-${villageId}-${monthPart}-${seq.toString().padStart(4, "0")}`;
}

// ═══════════════════════════════════════════
// Audit Log
// ═══════════════════════════════════════════

async function logAudit(billId: number, action: string, performedBy: string, details: Record<string, any>) {
  await db.insert(paymentAuditLog).values({
    billId,
    action,
    performedBy,
    details,
  });
}

// ═══════════════════════════════════════════
// Payments
// ═══════════════════════════════════════════

export async function markBillPaid(billId: number, data: {
  paymentMethod: string;
  receivedByUserId: string;
  gatewayTxnId?: string;
}) {
  const bill = await getBillById(billId);
  if (!bill) throw new Error("Bill not found");
  if (bill.status === "paid") throw new Error("Bill is already paid");
  if (bill.status === "waived") throw new Error("Bill is waived — cannot mark as paid");

  // Fix 2: Locked bill guard — prevent cash payment during active QR session
  // Gateway webhooks set gatewayTxnId, so they bypass this check intentionally
  if (bill.isLockedForPayment && !data.gatewayTxnId) {
    throw new Error("Bill is locked for an active payment session — wait for QR to expire or cancel it first");
  }

  const receiptNumber = await getNextReceiptNumber(bill.villageId, bill.billingMonth);

  // Race-safe: only update if still unpaid AND not locked (unless gateway payment)
  const whereConditions = [
    eq(householdMonthlyBills.id, billId),
    eq(householdMonthlyBills.status, "unpaid"),
  ];
  // For non-gateway payments, also enforce lock check at DB level
  if (!data.gatewayTxnId) {
    whereConditions.push(eq(householdMonthlyBills.isLockedForPayment, false));
  }

  const updated = await db.update(householdMonthlyBills)
    .set({
      status: "paid",
      paidAt: new Date(),
      paymentMethod: data.paymentMethod,
      receivedByUserId: data.receivedByUserId,
      gatewayTxnId: data.gatewayTxnId || null,
      receiptNumber,
      isLockedForPayment: false,
      updatedAt: new Date(),
    })
    .where(and(...whereConditions))
    .returning();

  if (updated.length === 0) {
    throw new Error("Bill status changed — payment not recorded (possible double payment prevented)");
  }

  // Audit log
  await logAudit(billId, AUDIT_ACTIONS.MARKED_PAID, data.receivedByUserId, {
    method: data.paymentMethod,
    receiptNumber,
    gatewayTxnId: data.gatewayTxnId || null,
  });

  return { receiptNumber, billId };
}

export async function markBillsPaidBulk(billIds: number[], data: {
  paymentMethod: string;
  receivedByUserId: string;
  gatewayTxnId?: string;
}) {
  const results = [];
  const receiptNumbers: string[] = [];
  for (const id of billIds) {
    try {
      const result = await markBillPaid(id, { ...data });
      results.push({ billId: id, receiptNumber: result.receiptNumber, success: true });
      receiptNumbers.push(result.receiptNumber);
    } catch (error: any) {
      results.push({ billId: id, success: false, error: error.message });
    }
  }

  // Single bulk audit entry if multiple bills
  if (billIds.length > 1 && receiptNumbers.length > 0) {
    await logAudit(billIds[0], AUDIT_ACTIONS.BULK_PAID, data.receivedByUserId, {
      billIds,
      method: data.paymentMethod,
      receiptNumbers,
      gatewayTxnId: data.gatewayTxnId || null,
    });
  }

  return results;
}

export async function undoBillPayment(billId: number, performedBy: string) {
  const bill = await getBillById(billId);
  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "paid") throw new Error("Bill is not paid — cannot undo");
  if (bill.paymentMethod !== "cash") throw new Error("Only cash payments can be undone. Gateway refunds must be handled via the provider dashboard.");

  // Store previous state for forensic audit
  await logAudit(billId, AUDIT_ACTIONS.UNDONE, performedBy, {
    previousReceiptNumber: bill.receiptNumber,
    previousPaidAt: bill.paidAt?.toISOString() || null,
    previousMethod: bill.paymentMethod,
    reason: "manager_correction",
  });

  await db.update(householdMonthlyBills)
    .set({
      status: "unpaid",
      paidAt: null,
      paymentMethod: null,
      receivedByUserId: null,
      gatewayTxnId: null,
      receiptNumber: null,
      isLockedForPayment: false,
      updatedAt: new Date(),
    })
    .where(eq(householdMonthlyBills.id, billId));
}

export async function waiveBill(billId: number, waivedBy: string, waivedReason: string) {
  const bill = await getBillById(billId);
  if (!bill) throw new Error("Bill not found");
  if (bill.status === "paid") throw new Error("Bill is already paid — cannot waive");

  await db.update(householdMonthlyBills)
    .set({
      status: "waived",
      waivedBy,
      waivedReason,
      isLockedForPayment: false,
      updatedAt: new Date(),
    })
    .where(eq(householdMonthlyBills.id, billId));

  await logAudit(billId, AUDIT_ACTIONS.WAIVED, waivedBy, {
    reason: waivedReason,
    feeWaived: bill.feeAmountSnapshot,
  });
}

// ═══════════════════════════════════════════
// Bill Locking (prevents duplicate gateway orders)
// ═══════════════════════════════════════════

export async function lockBillsForPayment(billIds: number[]): Promise<boolean> {
  // Only lock bills that are unpaid and not already locked
  const updated = await db.update(householdMonthlyBills)
    .set({ isLockedForPayment: true, updatedAt: new Date() })
    .where(and(
      inArray(householdMonthlyBills.id, billIds),
      eq(householdMonthlyBills.status, "unpaid"),
      eq(householdMonthlyBills.isLockedForPayment, false),
    ))
    .returning();

  // All bills must be lockable
  return updated.length === billIds.length;
}

export async function unlockBills(billIds: number[]) {
  await db.update(householdMonthlyBills)
    .set({ isLockedForPayment: false, updatedAt: new Date() })
    .where(inArray(householdMonthlyBills.id, billIds));
}

// ═══════════════════════════════════════════
// Summary / KPIs
// ═══════════════════════════════════════════

export async function getPaymentSummary(villageId: string, billingMonth: string) {
  const allBills = await db.select({
    status: householdMonthlyBills.status,
    feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
    paymentMethod: householdMonthlyBills.paymentMethod,
  })
    .from(householdMonthlyBills)
    .where(and(
      eq(householdMonthlyBills.villageId, villageId),
      eq(householdMonthlyBills.billingMonth, billingMonth),
    ));

  let totalDue = 0;
  let totalCollected = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let waivedCount = 0;
  let cashCount = 0;
  let gatewayCount = 0;

  for (const bill of allBills) {
    const amt = parseFloat(bill.feeAmountSnapshot || "0");
    if (bill.status === "paid") {
      totalDue += amt;
      totalCollected += amt;
      paidCount++;
      if (bill.paymentMethod === "cash") cashCount++;
      else gatewayCount++;
    } else if (bill.status === "unpaid") {
      totalDue += amt;
      unpaidCount++;
    } else if (bill.status === "waived") {
      waivedCount++;
    }
  }

  const collectionRate = totalDue > 0 ? ((totalCollected / totalDue) * 100).toFixed(1) : "0.0";

  // Past arrears — unpaid bills from previous months
  const pastArrearsResult = await db.select({ count: count() })
    .from(householdMonthlyBills)
    .where(and(
      eq(householdMonthlyBills.villageId, villageId),
      eq(householdMonthlyBills.status, "unpaid"),
      sql`${householdMonthlyBills.billingMonth} < ${billingMonth}`,
    ));

  return {
    billingMonth,
    totalDue: totalDue.toFixed(2),
    totalCollected: totalCollected.toFixed(2),
    outstanding: (totalDue - totalCollected).toFixed(2),
    collectionRate,
    paidCount,
    unpaidCount,
    waivedCount,
    cashCount,
    gatewayCount,
    totalBills: allBills.length,
    pastArrears: pastArrearsResult[0]?.count || 0,
  };
}

// ═══════════════════════════════════════════
// Gateway Config (provider-agnostic)
// ═══════════════════════════════════════════

export async function getGatewayConfig(villageId: string, provider?: string) {
  const conditions = [
    eq(villagePaymentGatewayConfig.villageId, villageId),
    eq(villagePaymentGatewayConfig.isActive, true),
  ];
  if (provider) {
    conditions.push(eq(villagePaymentGatewayConfig.provider, provider));
  }
  const [config] = await db.select({
    id: villagePaymentGatewayConfig.id,
    villageId: villagePaymentGatewayConfig.villageId,
    provider: villagePaymentGatewayConfig.provider,
    encryptedConfigJson: villagePaymentGatewayConfig.encryptedConfigJson,
    mdrPolicy: villagePaymentGatewayConfig.mdrPolicy,
    mdrPercentage: villagePaymentGatewayConfig.mdrPercentage,
    isActive: villagePaymentGatewayConfig.isActive,
    isTestMode: villagePaymentGatewayConfig.isTestMode,
    lastVerifiedAt: villagePaymentGatewayConfig.lastVerifiedAt,
    lastTestStatus: villagePaymentGatewayConfig.lastTestStatus,
    configuredBy: villagePaymentGatewayConfig.configuredBy,
    successRateLast30Days: villagePaymentGatewayConfig.successRateLast30Days,
    avgWebhookLatencyMs: villagePaymentGatewayConfig.avgWebhookLatencyMs,
    createdAt: villagePaymentGatewayConfig.createdAt,
    updatedAt: villagePaymentGatewayConfig.updatedAt,
  }).from(villagePaymentGatewayConfig)
    .where(and(...conditions))
    .limit(1);
  return config || null;
}

export async function getAllGatewayConfigs(villageId: string) {
  return db.select({
    id: villagePaymentGatewayConfig.id,
    villageId: villagePaymentGatewayConfig.villageId,
    provider: villagePaymentGatewayConfig.provider,
    mdrPolicy: villagePaymentGatewayConfig.mdrPolicy,
    mdrPercentage: villagePaymentGatewayConfig.mdrPercentage,
    isActive: villagePaymentGatewayConfig.isActive,
    isTestMode: villagePaymentGatewayConfig.isTestMode,
    successRateLast30Days: villagePaymentGatewayConfig.successRateLast30Days,
    avgWebhookLatencyMs: villagePaymentGatewayConfig.avgWebhookLatencyMs,
    lastVerifiedAt: villagePaymentGatewayConfig.lastVerifiedAt,
    lastTestStatus: villagePaymentGatewayConfig.lastTestStatus,
    configuredBy: villagePaymentGatewayConfig.configuredBy,
    createdAt: villagePaymentGatewayConfig.createdAt,
    updatedAt: villagePaymentGatewayConfig.updatedAt,
  }).from(villagePaymentGatewayConfig)
    .where(eq(villagePaymentGatewayConfig.villageId, villageId));
}

/**
 * Get list of active gateways for a village (lightweight, no encrypted config)
 */
export async function getActiveGateways(villageId: string) {
  const configs = await db.select({
    provider: villagePaymentGatewayConfig.provider,
    mdrPolicy: villagePaymentGatewayConfig.mdrPolicy,
    mdrPercentage: villagePaymentGatewayConfig.mdrPercentage,
    isTestMode: villagePaymentGatewayConfig.isTestMode,
  }).from(villagePaymentGatewayConfig)
    .where(and(
      eq(villagePaymentGatewayConfig.villageId, villageId),
      eq(villagePaymentGatewayConfig.isActive, true),
    ));
  return configs;
}

export async function saveGatewayConfig(data: {
  villageId: string;
  provider: string;
  configJson: Record<string, any>;
  mdrPolicy?: string;
  mdrPercentage?: string;
  isTestMode?: boolean;
  configuredBy: string;
}) {
  // Encrypt the config JSON
  const encrypted = encryptConfig(data.configJson);

  // Deactivate any existing active config for the SAME provider (not all providers)
  await db.update(villagePaymentGatewayConfig)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(villagePaymentGatewayConfig.villageId, data.villageId),
      eq(villagePaymentGatewayConfig.provider, data.provider),
      eq(villagePaymentGatewayConfig.isActive, true),
    ));

  // Insert new config as active
  const [config] = await db.insert(villagePaymentGatewayConfig)
    .values({
      villageId: data.villageId,
      provider: data.provider,
      encryptedConfigJson: encrypted,
      mdrPolicy: data.mdrPolicy || "village_absorbs",
      mdrPercentage: data.mdrPercentage || "0",
      isActive: true,
      isTestMode: data.isTestMode || false,
      configuredBy: data.configuredBy,
    })
    .returning();

  return config;
}

export async function deactivateGateway(villageId: string, provider: string) {
  await db.update(villagePaymentGatewayConfig)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(
      eq(villagePaymentGatewayConfig.villageId, villageId),
      eq(villagePaymentGatewayConfig.provider, provider),
      eq(villagePaymentGatewayConfig.isActive, true),
    ));
}

export async function updateGatewayTestStatus(villageId: string, status: string) {
  await db.update(villagePaymentGatewayConfig)
    .set({
      lastTestStatus: status,
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(villagePaymentGatewayConfig.villageId, villageId),
      eq(villagePaymentGatewayConfig.isActive, true),
    ));
}

// ═══════════════════════════════════════════
// Payment Gateway Orders
// ═══════════════════════════════════════════

/**
 * Get all unpaid bills for a household (for multi-select UI).
 * Returns sorted oldest → newest.
 */
export async function getUnpaidBillsByHousehold(householdId: number) {
  return db.select({
    bill: householdMonthlyBills,
    headName: households.headName,
    houseNumber: households.houseNumber,
    ward: households.ward,
    phone: households.phone,
  })
    .from(householdMonthlyBills)
    .innerJoin(households, eq(householdMonthlyBills.householdId, households.id))
    .where(and(
      eq(householdMonthlyBills.householdId, householdId),
      eq(householdMonthlyBills.status, "unpaid"),
    ))
    .orderBy(householdMonthlyBills.billingMonth);
}

/**
 * Find any pending order that overlaps with the given billIds.
 * Used to prevent duplicate QR sessions — returns the active session if one exists.
 */
export async function findPendingOrderForBills(billIds: number[]) {
  const pendingOrders = await db.select({
    id: paymentGatewayOrders.id,
    orderId: paymentGatewayOrders.orderId,
    villageId: paymentGatewayOrders.villageId,
    provider: paymentGatewayOrders.provider,
    billIds: paymentGatewayOrders.billIds,
    billAmounts: paymentGatewayOrders.billAmounts,
    totalAmount: paymentGatewayOrders.totalAmount,
    mdrAmount: paymentGatewayOrders.mdrAmount,
    chargeableAmount: paymentGatewayOrders.chargeableAmount,
    method: paymentGatewayOrders.method,
    status: paymentGatewayOrders.status,
    expiresAt: paymentGatewayOrders.expiresAt,
    createdAt: paymentGatewayOrders.createdAt,
  }).from(paymentGatewayOrders)
    .where(eq(paymentGatewayOrders.status, "pending"));

  const now = new Date();

  // Check for overlap in billIds arrays, skip expired orders
  for (const order of pendingOrders) {
    // Auto-expire old orders
    if (order.expiresAt && new Date(order.expiresAt) < now) {
      await updateOrderStatus(order.orderId, "expired");
      await unlockBills((order.billIds || []) as number[]);
      continue;
    }

    const orderBillIds = (order.billIds || []) as number[];
    const overlap = billIds.some(id => orderBillIds.includes(id));
    if (overlap) {
      return order;
    }
  }
  return null;
}

export async function createGatewayOrder(data: {
  orderId: string;
  villageId: string;
  provider: string;
  billIds: number[];
  billAmounts: number[];
  totalAmount: string;
  mdrAmount: string;
  chargeableAmount: string;
  method: string;
}) {
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 min payment session

  const [order] = await db.insert(paymentGatewayOrders)
    .values({
      ...data,
      status: "pending",
      expiresAt,
    })
    .returning();

  return order;
}

export async function getOrderById(orderId: string) {
  const [order] = await db.select({
    id: paymentGatewayOrders.id,
    orderId: paymentGatewayOrders.orderId,
    villageId: paymentGatewayOrders.villageId,
    provider: paymentGatewayOrders.provider,
    billIds: paymentGatewayOrders.billIds,
    billAmounts: paymentGatewayOrders.billAmounts,
    totalAmount: paymentGatewayOrders.totalAmount,
    mdrAmount: paymentGatewayOrders.mdrAmount,
    chargeableAmount: paymentGatewayOrders.chargeableAmount,
    method: paymentGatewayOrders.method,
    status: paymentGatewayOrders.status,
    expiresAt: paymentGatewayOrders.expiresAt,
    createdAt: paymentGatewayOrders.createdAt,
  }).from(paymentGatewayOrders)
    .where(eq(paymentGatewayOrders.orderId, orderId))
    .limit(1);
  return order || null;
}

/**
 * Find order by truncated ID (PayU sends back txnid which may be truncated to 40 chars)
 */
export async function findOrderByTruncatedId(truncatedId: string) {
  const orders = await db.select({
    id: paymentGatewayOrders.id,
    orderId: paymentGatewayOrders.orderId,
    villageId: paymentGatewayOrders.villageId,
    provider: paymentGatewayOrders.provider,
    billIds: paymentGatewayOrders.billIds,
    billAmounts: paymentGatewayOrders.billAmounts,
    totalAmount: paymentGatewayOrders.totalAmount,
    mdrAmount: paymentGatewayOrders.mdrAmount,
    chargeableAmount: paymentGatewayOrders.chargeableAmount,
    method: paymentGatewayOrders.method,
    status: paymentGatewayOrders.status,
    expiresAt: paymentGatewayOrders.expiresAt,
    createdAt: paymentGatewayOrders.createdAt,
  }).from(paymentGatewayOrders)
    .where(like(paymentGatewayOrders.orderId, `${truncatedId}%`))
    .limit(1);
  return orders[0] || null;
}

export async function updateOrderStatus(orderId: string, status: string) {
  await db.update(paymentGatewayOrders)
    .set({ status })
    .where(eq(paymentGatewayOrders.orderId, orderId));
}

/**
 * Expire stale pending orders (called by background worker every 10 min).
 * Also unlocks associated bills.
 */
export async function expirePendingOrders() {
  const now = new Date();
  const expiredOrders = await db.update(paymentGatewayOrders)
    .set({ status: "expired" })
    .where(and(
      eq(paymentGatewayOrders.status, "pending"),
      sql`${paymentGatewayOrders.expiresAt} < ${now}`,
    ))
    .returning();

  // Unlock bills from expired orders
  for (const order of expiredOrders) {
    if (order.billIds && Array.isArray(order.billIds)) {
      await unlockBills(order.billIds as number[]);
    }
  }

  return expiredOrders.length;
}

// ═══════════════════════════════════════════
// Payment Gateway Events (webhook audit)
// ═══════════════════════════════════════════

export async function logGatewayEvent(data: {
  villageId: string;
  provider: string;
  eventType: string;
  orderId?: string;
  gatewayTxnId: string;
  amountPaise?: number;
  rawPayload: any;
  webhookLatencyMs?: number;
  status: string;
}) {
  try {
    const [event] = await db.insert(paymentGatewayEvents)
      .values({
        ...data,
        processedAt: new Date(),
      })
      .returning();
    return { event, isDuplicate: false };
  } catch (error: any) {
    // Unique constraint violation = duplicate event
    if (error.code === "23505") {
      return { event: null, isDuplicate: true };
    }
    throw error;
  }
}

/**
 * Update gateway health stats after webhook processing.
 */
export async function updateGatewayHealthStats(villageId: string, latencyMs: number) {
  // Simple rolling average update
  const config = await getGatewayConfig(villageId);
  if (!config) return;

  const currentAvg = config.avgWebhookLatencyMs || latencyMs;
  const newAvg = Math.round((currentAvg * 0.9) + (latencyMs * 0.1)); // exponential moving average

  await db.update(villagePaymentGatewayConfig)
    .set({
      avgWebhookLatencyMs: newAvg,
      updatedAt: new Date(),
    })
    .where(eq(villagePaymentGatewayConfig.id, config.id));
}

// ═══════════════════════════════════════════
// Household Self-Service (Generator / My Bills)
// ═══════════════════════════════════════════

/**
 * Get household by generator user ID (for session → household resolution)
 */
export async function getHouseholdByGeneratorUserId(generatorUserId: string) {
  const [hh] = await db.select({
    id: households.id,
    uid: households.uid,
    headName: households.headName,
    houseNumber: households.houseNumber,
    ward: households.ward,
    phone: households.phone,
    householdType: households.householdType,
    villageId: households.villageId,
  }).from(households)
    .where(eq(households.generatorUserId, generatorUserId));
  return hh || null;
}

/**
 * Get household by numeric ID (for payment customer details)
 */
export async function getHouseholdById(householdId: number) {
  const [hh] = await db.select({
    id: households.id,
    uid: households.uid,
    headName: households.headName,
    houseNumber: households.houseNumber,
    ward: households.ward,
    phone: households.phone,
    householdType: households.householdType,
    villageId: households.villageId,
  }).from(households)
    .where(eq(households.id, householdId));
  return hh || null;
}

/**
 * Get all unpaid bills for a household (generator self-service)
 */
export async function getMyUnpaidBills(householdId: number) {
  return db.select({
    id: householdMonthlyBills.id,
    householdId: householdMonthlyBills.householdId,
    villageId: householdMonthlyBills.villageId,
    billingMonth: householdMonthlyBills.billingMonth,
    cycleId: householdMonthlyBills.cycleId,
    householdTypeSnapshot: householdMonthlyBills.householdTypeSnapshot,
    feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
    status: householdMonthlyBills.status,
    paidAt: householdMonthlyBills.paidAt,
    paymentMethod: householdMonthlyBills.paymentMethod,
    receiptNumber: householdMonthlyBills.receiptNumber,
    waivedReason: householdMonthlyBills.waivedReason,
  }).from(householdMonthlyBills)
    .where(and(
      eq(householdMonthlyBills.householdId, householdId),
      eq(householdMonthlyBills.status, "unpaid"),
    ))
    .orderBy(householdMonthlyBills.billingMonth);
}

/**
 * Get payment history for a household (last 12 months, all statuses)
 */
export async function getMyPaymentHistory(householdId: number) {
  return db.select({
    id: householdMonthlyBills.id,
    householdId: householdMonthlyBills.householdId,
    villageId: householdMonthlyBills.villageId,
    billingMonth: householdMonthlyBills.billingMonth,
    cycleId: householdMonthlyBills.cycleId,
    householdTypeSnapshot: householdMonthlyBills.householdTypeSnapshot,
    feeAmountSnapshot: householdMonthlyBills.feeAmountSnapshot,
    status: householdMonthlyBills.status,
    paidAt: householdMonthlyBills.paidAt,
    paymentMethod: householdMonthlyBills.paymentMethod,
    receiptNumber: householdMonthlyBills.receiptNumber,
    waivedReason: householdMonthlyBills.waivedReason,
  }).from(householdMonthlyBills)
    .where(eq(householdMonthlyBills.householdId, householdId))
    .orderBy(desc(householdMonthlyBills.billingMonth))
    .limit(12);
}
