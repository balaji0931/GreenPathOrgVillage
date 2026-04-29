import {
    collectorDailyWasteLog,
    type CollectorDailyWasteLog,
    type InsertCollectorDailyWasteLog,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

// =====================================================
// COLLECTOR DAILY WASTE LOG OPERATIONS
// =====================================================

export async function createCollectorWasteLog(log: InsertCollectorDailyWasteLog): Promise<CollectorDailyWasteLog> {
    const [result] = await db
        .insert(collectorDailyWasteLog)
        .values(log)
        .returning();
    return result;
}

/** All entries by a specific collector (their history) */
export async function getCollectorWasteLogsByCollector(
    collectorId: number,
    startDate?: string,
    endDate?: string,
): Promise<CollectorDailyWasteLog[]> {
    const conditions = [eq(collectorDailyWasteLog.collectorId, collectorId)];
    if (startDate) conditions.push(gte(collectorDailyWasteLog.date, startDate));
    if (endDate) conditions.push(lte(collectorDailyWasteLog.date, endDate));

    return await db
        .select()
        .from(collectorDailyWasteLog)
        .where(and(...conditions))
        .orderBy(desc(collectorDailyWasteLog.date));
}

/** All entries for a village on a given date (all collectors combined) */
export async function getCollectorWasteLogsByVillageAndDate(
    villageId: string,
    date: string,
): Promise<CollectorDailyWasteLog[]> {
    return await db
        .select()
        .from(collectorDailyWasteLog)
        .where(and(
            eq(collectorDailyWasteLog.villageId, villageId),
            eq(collectorDailyWasteLog.date, date),
        ))
        .orderBy(desc(collectorDailyWasteLog.createdAt));
}

/** Summed totals for a village on a given date - used by manager form pre-load & premium report fallback */
export async function getCollectorWasteLogSummaryByVillageAndDate(
    villageId: string,
    date: string,
): Promise<{
    wetWasteKg: number;
    dryWasteKg: number;
    specialCareWasteKg: number;
    sanitaryWasteKg: number;
    mixedWasteKg: number;
    entryCount: number;
} | null> {
    const [result] = await db
        .select({
            wetWasteKg: sql<string>`COALESCE(SUM(${collectorDailyWasteLog.wetWasteKg}), 0)`,
            dryWasteKg: sql<string>`COALESCE(SUM(${collectorDailyWasteLog.dryWasteKg}), 0)`,
            specialCareWasteKg: sql<string>`COALESCE(SUM(${collectorDailyWasteLog.specialCareWasteKg}), 0)`,
            sanitaryWasteKg: sql<string>`COALESCE(SUM(${collectorDailyWasteLog.sanitaryWasteKg}), 0)`,
            mixedWasteKg: sql<string>`COALESCE(SUM(${collectorDailyWasteLog.mixedWasteKg}), 0)`,
            entryCount: sql<number>`COUNT(*)::int`,
        })
        .from(collectorDailyWasteLog)
        .where(and(
            eq(collectorDailyWasteLog.villageId, villageId),
            eq(collectorDailyWasteLog.date, date),
        ));

    if (!result || result.entryCount === 0) return null;

    return {
        wetWasteKg: parseFloat(result.wetWasteKg),
        dryWasteKg: parseFloat(result.dryWasteKg),
        specialCareWasteKg: parseFloat(result.specialCareWasteKg),
        sanitaryWasteKg: parseFloat(result.sanitaryWasteKg),
        mixedWasteKg: parseFloat(result.mixedWasteKg),
        entryCount: result.entryCount,
    };
}

export async function updateCollectorWasteLog(id: number, updates: Partial<CollectorDailyWasteLog>): Promise<CollectorDailyWasteLog> {
    const [result] = await db
        .update(collectorDailyWasteLog)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(collectorDailyWasteLog.id, id))
        .returning();
    return result;
}

export async function deleteCollectorWasteLog(id: number): Promise<void> {
    await db.delete(collectorDailyWasteLog).where(eq(collectorDailyWasteLog.id, id));
}

export async function getCollectorWasteLogById(id: number): Promise<CollectorDailyWasteLog | undefined> {
    const [result] = await db
        .select()
        .from(collectorDailyWasteLog)
        .where(eq(collectorDailyWasteLog.id, id));
    return result || undefined;
}
