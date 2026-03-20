import {
    villages,
    users,
    households,
    collectors,
    wasteCollections,
    issues,
    announcements,
    feedback,
    moderatorVillageAssignments,
    paymentAuditLog,
    paymentGatewayEvents,
    paymentGatewayOrders,
    villagePaymentGatewayConfig,
    receiptCounters,
    householdMonthlyBills,
    billingCycles,
    villageMonthFeeConfig,
    householdTypes,
    auditLogs,
    villageStaff,
    pushSubscriptions,
    dailyVillageStats,
    dailyWardStats,
    dailyVehicleStats,
    dailyHourlyStats,
    attendanceCenters,
    shiftLogs,
    workerAttendance,
    systemJobs,
    householdBehaviourStats,
    type Village,
    type InsertVillage,
} from "@shared/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function createVillage(insertVillage: InsertVillage): Promise<Village> {
    const cache = getCache();
    const [village] = await db
        .insert(villages)
        .values(insertVillage as any)
        .returning();

    // Invalidate village caches
    await cache.delete(cacheKeys.villages());
    await cache.clear('villages:paginated:*'); // Clear all paginated caches

    return village;
}

export async function getVillages(): Promise<Village[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.villages());
    if (cached) return cached;

    const safeVillageColumns = {
        id: villages.id,
        villageId: villages.villageId,
        name: villages.name,
        imageUploadRequired: villages.imageUploadRequired,
        weightRequired: villages.weightRequired,
        wards: villages.wards,
        locationServicesEnabled: villages.locationServicesEnabled,
        paymentsEnabled: villages.paymentsEnabled,
        attendanceEnabled: villages.attendanceEnabled,
        behaviourThresholds: villages.behaviourThresholds,
        vehicles: villages.vehicles,
        totalHouseholds: villages.totalHouseholds,
        proximityAlertsEnabled: villages.proximityAlertsEnabled,
        notificationRadiusMeters: villages.notificationRadiusMeters,
        notificationWindowStart: villages.notificationWindowStart,
        notificationWindowEnd: villages.notificationWindowEnd,
        createdAt: villages.createdAt,
        updatedAt: villages.updatedAt,
    };
    const result = await db.select(safeVillageColumns).from(villages).orderBy(villages.villageId).limit(500);
    await cache.set(cacheKeys.villages(), result, 3600); // 1 hour TTL
    return result;
}

export async function getVillageByVillageId(villageId: string): Promise<Village | undefined> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.village(villageId));
    if (cached) return cached;

    const [village] = await db.select({
        id: villages.id,
        villageId: villages.villageId,
        name: villages.name,
        imageUploadRequired: villages.imageUploadRequired,
        weightRequired: villages.weightRequired,
        wards: villages.wards,
        locationServicesEnabled: villages.locationServicesEnabled,
        paymentsEnabled: villages.paymentsEnabled,
        attendanceEnabled: villages.attendanceEnabled,
        behaviourThresholds: villages.behaviourThresholds,
        vehicles: villages.vehicles,
        totalHouseholds: villages.totalHouseholds,
        proximityAlertsEnabled: villages.proximityAlertsEnabled,
        notificationRadiusMeters: villages.notificationRadiusMeters,
        notificationWindowStart: villages.notificationWindowStart,
        notificationWindowEnd: villages.notificationWindowEnd,
        createdAt: villages.createdAt,
        updatedAt: villages.updatedAt,
    }).from(villages).where(eq(villages.villageId, villageId));
    if (village) {
        await cache.set(cacheKeys.village(villageId), village, 3600);
    }
    return village || undefined;
}

export async function updateVillage(villageId: string, updates: Partial<Village>): Promise<Village> {
    const cache = getCache();
    const [village] = await db
        .update(villages)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(villages.villageId, villageId))
        .returning();

    // Invalidate all village caches including paginated
    await cache.delete(cacheKeys.village(villageId));
    await cache.delete(cacheKeys.villages());

    await cache.clear('villages:paginated:*'); // Clear all paginated village caches

    return village;
}

export async function getWardsByVillage(villageId: string): Promise<string[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.wards(villageId));
    if (cached) return cached;

    const [village] = await db
        .select({ wards: villages.wards })
        .from(villages)
        .where(eq(villages.villageId, villageId));

    const wards = (village?.wards || [])
        .filter((ward: string | null) => ward && ward.trim() !== '')
        .sort();

    await cache.set(cacheKeys.wards(villageId), wards, 3600);
    return wards;
}

export async function addWardToVillage(villageId: string, ward: string): Promise<string[]> {
    const cache = getCache();

    const [village] = await db
        .select({ wards: villages.wards })
        .from(villages)
        .where(eq(villages.villageId, villageId));

    const existingWards = village?.wards || [];
    if (existingWards.includes(ward)) {
        throw new Error("Ward already exists");
    }

    const updatedWards = [...existingWards, ward].sort();

    await db
        .update(villages)
        .set({ wards: updatedWards, updatedAt: new Date() })
        .where(eq(villages.villageId, villageId));

    await cache.delete(cacheKeys.wards(villageId));
    await cache.delete(cacheKeys.village(villageId));

    return updatedWards;
}

export async function deleteVillage(villageId: string): Promise<void> {
    // Delete in proper order to avoid foreign key violations

    // 1. Delete waste collections for this village's households
    await db.delete(wasteCollections)
        .where(sql`household_id IN (SELECT id FROM households WHERE village_id = ${villageId})`);

    // 2. Delete feedback and for this village's collectors
    await db.delete(feedback)
        .where(sql`to_collector_id IN (SELECT id FROM collectors WHERE village_id = ${villageId})`);

    await db.delete(moderatorVillageAssignments)
        .where(sql`village_id = ${villageId}`);

    // Delete Payment and Analytics Tables
    await db.delete(paymentAuditLog).where(sql`bill_id IN (SELECT id FROM household_monthly_bills WHERE village_id = ${villageId})`);
    await db.delete(paymentGatewayEvents).where(eq(paymentGatewayEvents.villageId, villageId));
    await db.delete(paymentGatewayOrders).where(eq(paymentGatewayOrders.villageId, villageId));
    await db.delete(villagePaymentGatewayConfig).where(eq(villagePaymentGatewayConfig.villageId, villageId));
    await db.delete(receiptCounters).where(eq(receiptCounters.villageId, villageId));
    await db.delete(householdMonthlyBills).where(eq(householdMonthlyBills.villageId, villageId));
    await db.delete(billingCycles).where(eq(billingCycles.villageId, villageId));
    await db.delete(villageMonthFeeConfig).where(eq(villageMonthFeeConfig.villageId, villageId));
    await db.delete(householdTypes).where(eq(householdTypes.villageId, villageId));
    await db.delete(householdBehaviourStats).where(sql`household_id IN (SELECT id FROM households WHERE village_id = ${villageId})`);
    await db.delete(auditLogs).where(eq(auditLogs.villageId, villageId));
    await db.delete(villageStaff).where(eq(villageStaff.villageId, villageId));
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.villageId, villageId));

    // Delete Analytics & Stats Tables
    await db.delete(dailyVillageStats).where(eq(dailyVillageStats.villageId, villageId));
    await db.delete(dailyWardStats).where(eq(dailyWardStats.villageId, villageId));
    await db.delete(dailyVehicleStats).where(eq(dailyVehicleStats.villageId, villageId));
    await db.delete(dailyHourlyStats).where(eq(dailyHourlyStats.villageId, villageId));
    await db.delete(attendanceCenters).where(eq(attendanceCenters.villageId, villageId));
    await db.delete(shiftLogs).where(eq(shiftLogs.villageId, villageId));
    await db.delete(workerAttendance).where(eq(workerAttendance.villageId, villageId));



    // 3. Delete main tables
    await db.delete(households).where(eq(households.villageId, villageId));
    await db.delete(collectors).where(eq(collectors.villageId, villageId));
    await db.delete(issues).where(eq(issues.villageId, villageId));
    await db.delete(announcements).where(eq(announcements.villageId, villageId));
    await db.delete(users).where(eq(users.villageId, villageId));
    await db.delete(villages).where(eq(villages.villageId, villageId));
}
