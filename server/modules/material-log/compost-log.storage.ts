import {
    compostProductionLog,
    type CompostProductionLog,
    type InsertCompostProductionLog,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, gte, lte, and } from "drizzle-orm";

// =====================================================
// COMPOST PRODUCTION LOG OPERATIONS (Manager-only)
// =====================================================

export async function createCompostProductionLog(log: InsertCompostProductionLog): Promise<CompostProductionLog> {
    const [result] = await db
        .insert(compostProductionLog)
        .values(log)
        .returning();
    return result;
}

export async function getCompostProductionLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<CompostProductionLog[]> {
    let conditions = [eq(compostProductionLog.villageId, villageId)];

    if (startDate) {
        conditions.push(gte(compostProductionLog.date, startDate));
    }
    if (endDate) {
        conditions.push(lte(compostProductionLog.date, endDate));
    }

    return await db
        .select()
        .from(compostProductionLog)
        .where(and(...conditions))
        .orderBy(desc(compostProductionLog.date));
}

export async function getCompostProductionLogById(id: number): Promise<CompostProductionLog | undefined> {
    const [result] = await db
        .select()
        .from(compostProductionLog)
        .where(eq(compostProductionLog.id, id));
    return result || undefined;
}

export async function updateCompostProductionLog(id: number, updates: Partial<CompostProductionLog>): Promise<CompostProductionLog> {
    const [result] = await db
        .update(compostProductionLog)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(compostProductionLog.id, id))
        .returning();
    return result;
}

export async function deleteCompostProductionLog(id: number): Promise<void> {
    await db.delete(compostProductionLog).where(eq(compostProductionLog.id, id));
}
