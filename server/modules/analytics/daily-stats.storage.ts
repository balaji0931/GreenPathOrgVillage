import {
    dailyVillageStats,
    dailyWardStats,
    dailyVehicleStats,
    dailyHourlyStats,
    villages,
    households,
    wasteCollections,
    collectors,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, sql, count } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// Helper: Convert a Date to IST date string (YYYY-MM-DD)
// ═══════════════════════════════════════════════════════════════

export function toISTDateString(date: Date): string {
    // IST = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().split("T")[0];
}

export function toISTHour(date: Date): number {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.getUTCHours();
}

// ═══════════════════════════════════════════════════════════════
// UPSERT Functions — called after each collection event
// ═══════════════════════════════════════════════════════════════

/**
 * Upsert daily village stats — increment collected_count and segregation_sum.
 */
export async function upsertDailyVillageStats(
    villageId: string,
    reportDate: string,
    segregationRating: number,
    currentTotalHouseholds: number,
    txn?: typeof db
): Promise<void> {
    const database = txn || db;
    await database
        .insert(dailyVillageStats)
        .values({
            villageId,
            reportDate,
            totalHouseholds: currentTotalHouseholds,
            collectedCount: 1,
            segregationSum: String(segregationRating),
        })
        .onConflictDoUpdate({
            target: [dailyVillageStats.villageId, dailyVillageStats.reportDate],
            set: {
                collectedCount: sql`${dailyVillageStats.collectedCount} + 1`,
                segregationSum: sql`${dailyVillageStats.segregationSum} + ${segregationRating}`,
                totalHouseholds: currentTotalHouseholds,
                updatedAt: sql`NOW()`,
            },
        });
}

/**
 * Upsert daily ward stats — increment collected_count for a specific ward.
 */
export async function upsertDailyWardStats(
    villageId: string,
    reportDate: string,
    wardName: string,
    wardTotalHouseholds: number,
    txn?: typeof db
): Promise<void> {
    const database = txn || db;
    await database
        .insert(dailyWardStats)
        .values({
            villageId,
            reportDate,
            wardName,
            totalHouseholds: wardTotalHouseholds,
            collectedCount: 1,
        })
        .onConflictDoUpdate({
            target: [dailyWardStats.villageId, dailyWardStats.reportDate, dailyWardStats.wardName],
            set: {
                collectedCount: sql`${dailyWardStats.collectedCount} + 1`,
                totalHouseholds: wardTotalHouseholds,
                updatedAt: sql`NOW()`,
            },
        });
}

/**
 * Upsert daily vehicle stats — increment count, update first/last timestamps.
 */
export async function upsertDailyVehicleStats(
    villageId: string,
    reportDate: string,
    registrationNumber: string,
    vehicleName: string,
    collectorNames: string,
    collectionDate: Date,
    txn?: typeof db
): Promise<void> {
    const database = txn || db;
    await database
        .insert(dailyVehicleStats)
        .values({
            villageId,
            reportDate,
            registrationNumber,
            vehicleName,
            collectorNames,
            collectedCount: 1,
            firstCollectionAt: collectionDate,
            lastCollectionAt: collectionDate,
        })
        .onConflictDoUpdate({
            target: [dailyVehicleStats.villageId, dailyVehicleStats.reportDate, dailyVehicleStats.registrationNumber],
            set: {
                collectedCount: sql`${dailyVehicleStats.collectedCount} + 1`,
                firstCollectionAt: sql`LEAST(${dailyVehicleStats.firstCollectionAt}, ${collectionDate})`,
                lastCollectionAt: sql`GREATEST(${dailyVehicleStats.lastCollectionAt}, ${collectionDate})`,
                collectorNames,
                updatedAt: sql`NOW()`,
            },
        });
}

/**
 * Upsert daily hourly stats — increment collection count for a specific hour+vehicle.
 */
export async function upsertDailyHourlyStats(
    villageId: string,
    reportDate: string,
    hour: number,
    vehicleName: string,
    txn?: typeof db
): Promise<void> {
    const database = txn || db;
    await database
        .insert(dailyHourlyStats)
        .values({
            villageId,
            reportDate,
            hour,
            vehicleName,
            collectionCount: 1,
        })
        .onConflictDoUpdate({
            target: [dailyHourlyStats.villageId, dailyHourlyStats.reportDate, dailyHourlyStats.hour, dailyHourlyStats.vehicleName],
            set: {
                collectionCount: sql`${dailyHourlyStats.collectionCount} + 1`,
                updatedAt: sql`NOW()`,
            },
        });
}

// ═══════════════════════════════════════════════════════════════
// Household Count Updates
// ═══════════════════════════════════════════════════════════════

/**
 * Increment village totalHouseholds and update today's stats rows.
 */
export async function incrementHouseholdCount(
    villageId: string,
    wardName: string
): Promise<void> {
    const today = toISTDateString(new Date());

    // Increment village counter
    await db
        .update(villages)
        .set({
            totalHouseholds: sql`${villages.totalHouseholds} + 1`,
            updatedAt: sql`NOW()`,
        })
        .where(eq(villages.villageId, villageId));

    // Get updated total
    const [village] = await db
        .select({ totalHouseholds: villages.totalHouseholds })
        .from(villages)
        .where(eq(villages.villageId, villageId))
        .limit(1);

    const newTotal = village?.totalHouseholds ?? 0;

    // Upsert today's village stats with new total
    await db
        .insert(dailyVillageStats)
        .values({ villageId, reportDate: today, totalHouseholds: newTotal, collectedCount: 0, segregationSum: "0" })
        .onConflictDoUpdate({
            target: [dailyVillageStats.villageId, dailyVillageStats.reportDate],
            set: { totalHouseholds: newTotal, updatedAt: sql`NOW()` },
        });

    // Get ward household count
    const [wardCount] = await db
        .select({ total: count() })
        .from(households)
        .where(and(eq(households.villageId, villageId), eq(households.ward, wardName)));

    // Upsert today's ward stats with new total
    await db
        .insert(dailyWardStats)
        .values({ villageId, reportDate: today, wardName, totalHouseholds: wardCount?.total ?? 0, collectedCount: 0 })
        .onConflictDoUpdate({
            target: [dailyWardStats.villageId, dailyWardStats.reportDate, dailyWardStats.wardName],
            set: { totalHouseholds: wardCount?.total ?? 0, updatedAt: sql`NOW()` },
        });
}

/**
 * Decrement village totalHouseholds and update today's stats rows.
 */
export async function decrementHouseholdCount(
    villageId: string,
    wardName: string
): Promise<void> {
    const today = toISTDateString(new Date());

    // Decrement village counter (never below 0)
    await db
        .update(villages)
        .set({
            totalHouseholds: sql`GREATEST(${villages.totalHouseholds} - 1, 0)`,
            updatedAt: sql`NOW()`,
        })
        .where(eq(villages.villageId, villageId));

    // Get updated total
    const [village] = await db
        .select({ totalHouseholds: villages.totalHouseholds })
        .from(villages)
        .where(eq(villages.villageId, villageId))
        .limit(1);

    const newTotal = village?.totalHouseholds ?? 0;

    // Upsert today's village stats
    await db
        .insert(dailyVillageStats)
        .values({ villageId, reportDate: today, totalHouseholds: newTotal, collectedCount: 0, segregationSum: "0" })
        .onConflictDoUpdate({
            target: [dailyVillageStats.villageId, dailyVillageStats.reportDate],
            set: { totalHouseholds: newTotal, updatedAt: sql`NOW()` },
        });

    // Get ward household count (after deletion)
    const [wardCount] = await db
        .select({ total: count() })
        .from(households)
        .where(and(eq(households.villageId, villageId), eq(households.ward, wardName)));

    // Upsert today's ward stats
    await db
        .insert(dailyWardStats)
        .values({ villageId, reportDate: today, wardName, totalHouseholds: wardCount?.total ?? 0, collectedCount: 0 })
        .onConflictDoUpdate({
            target: [dailyWardStats.villageId, dailyWardStats.reportDate, dailyWardStats.wardName],
            set: { totalHouseholds: wardCount?.total ?? 0, updatedAt: sql`NOW()` },
        });
}

// ═══════════════════════════════════════════════════════════════
// Transactional stats update — called after collection insert
// ═══════════════════════════════════════════════════════════════

export interface CollectionStatsContext {
    villageId: string;
    collectionDate: Date;
    segregationRating: number;
    ward: string;
    registrationNumber: string;   // vehicle reg or "Unassigned"
    vehicleName: string;          // vehicle name or "Unassigned"
    collectorNames: string;       // comma-joined collector names
    currentTotalHouseholds: number;
    wardTotalHouseholds: number;
}

/**
 * Update all 4 daily stats tables in a single transaction.
 * Called after inserting a waste_collection row.
 */
export async function updateDailyStatsAfterCollection(ctx: CollectionStatsContext): Promise<void> {
    const reportDate = toISTDateString(ctx.collectionDate);
    const hour = toISTHour(ctx.collectionDate);

    await db.transaction(async (txn) => {
        await upsertDailyVillageStats(
            ctx.villageId, reportDate, ctx.segregationRating, ctx.currentTotalHouseholds, txn as any
        );
        await upsertDailyWardStats(
            ctx.villageId, reportDate, ctx.ward, ctx.wardTotalHouseholds, txn as any
        );
        await upsertDailyVehicleStats(
            ctx.villageId, reportDate, ctx.registrationNumber, ctx.vehicleName,
            ctx.collectorNames, ctx.collectionDate, txn as any
        );
        await upsertDailyHourlyStats(
            ctx.villageId, reportDate, hour, ctx.vehicleName, txn as any
        );
    });
}

// ═══════════════════════════════════════════════════════════════
// Session Derivation — pure in-memory computation
// ═══════════════════════════════════════════════════════════════

export interface DerivedSession {
    index: number;
    startTime: string;
    endTime: string;
    count: number;
    durationMs: number;
    breakBeforeMs: number;
}

export interface SessionResult {
    sessions: DerivedSession[];
    totalWorkMs: number;
    totalBreakMs: number;
}

const SESSION_GAP_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Derive vehicle sessions from sorted collection timestamps.
 * Algorithm: group consecutive collections within 20-min gaps into sessions.
 */
export function deriveVehicleSessions(timestamps: Date[]): SessionResult {
    if (timestamps.length === 0) {
        return { sessions: [], totalWorkMs: 0, totalBreakMs: 0 };
    }

    const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());

    const rawSessions: { start: Date; end: Date; count: number }[] = [];
    let current = { start: sorted[0], end: sorted[0], count: 1 };

    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].getTime() - current.end.getTime();
        if (gap <= SESSION_GAP_MS) {
            current.end = sorted[i];
            current.count++;
        } else {
            rawSessions.push(current);
            current = { start: sorted[i], end: sorted[i], count: 1 };
        }
    }
    rawSessions.push(current);

    let totalWorkMs = 0;
    let totalBreakMs = 0;
    const sessions: DerivedSession[] = rawSessions.map((s, i) => {
        const durationMs = s.end.getTime() - s.start.getTime();
        const breakBeforeMs = i > 0 ? s.start.getTime() - rawSessions[i - 1].end.getTime() : 0;
        totalWorkMs += durationMs;
        totalBreakMs += breakBeforeMs;
        return {
            index: i + 1,
            startTime: s.start.toISOString(),
            endTime: s.end.toISOString(),
            count: s.count,
            durationMs,
            breakBeforeMs,
        };
    });

    return { sessions, totalWorkMs, totalBreakMs };
}
