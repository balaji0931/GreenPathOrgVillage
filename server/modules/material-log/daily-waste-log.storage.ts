import {
    dailyWasteLog,
    type DailyWasteLog,
    type InsertDailyWasteLog,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, gte, lte, and } from "drizzle-orm";

// =====================================================
// DAILY WASTE LOG OPERATIONS (Manager-only)
// =====================================================

export async function createDailyWasteLog(log: InsertDailyWasteLog): Promise<DailyWasteLog> {
    const [result] = await db
        .insert(dailyWasteLog)
        .values(log)
        .returning();
    return result;
}

export async function getDailyWasteLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<DailyWasteLog[]> {
    let conditions = [eq(dailyWasteLog.villageId, villageId)];

    if (startDate) {
        conditions.push(gte(dailyWasteLog.date, startDate));
    }
    if (endDate) {
        conditions.push(lte(dailyWasteLog.date, endDate));
    }

    return await db
        .select()
        .from(dailyWasteLog)
        .where(and(...conditions))
        .orderBy(desc(dailyWasteLog.date));
}

export async function getDailyWasteLogByDate(villageId: string, date: string): Promise<DailyWasteLog | undefined> {
    const [result] = await db
        .select()
        .from(dailyWasteLog)
        .where(and(
            eq(dailyWasteLog.villageId, villageId),
            eq(dailyWasteLog.date, date)
        ));
    return result || undefined;
}

export async function updateDailyWasteLog(id: number, updates: Partial<DailyWasteLog>): Promise<DailyWasteLog> {
    const [result] = await db
        .update(dailyWasteLog)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dailyWasteLog.id, id))
        .returning();
    return result;
}

export async function deleteDailyWasteLog(id: number): Promise<void> {
    await db.delete(dailyWasteLog).where(eq(dailyWasteLog.id, id));
}
