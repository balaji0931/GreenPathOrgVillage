import {
    feedback,
    households,
    collectors,
    type Feedback,
    type InsertFeedback,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";

export async function createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedbackRecord] = await db
        .insert(feedback)
        .values(insertFeedback)
        .returning();
    return feedbackRecord;
}

export async function getFeedbackByCollector(collectorId: number): Promise<Feedback[]> {
    return await db
        .select()
        .from(feedback)
        .where(eq(feedback.toCollectorId, collectorId))
        .orderBy(desc(feedback.createdAt));
}

export async function getFeedbackByHouseholdAndCollector(householdId: number, collectorId: number): Promise<Feedback | undefined> {
    const [feedbackRecord] = await db
        .select()
        .from(feedback)
        .where(and(eq(feedback.fromHouseholdId, householdId), eq(feedback.toCollectorId, collectorId)))
        .limit(1);
    return feedbackRecord || undefined;
}

export async function getFeedbackByVillageWithFilters(villageId: string, date?: string): Promise<any[]> {
    let baseConditions = [eq(households.villageId, villageId)];

    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        baseConditions.push(
            sql`${feedback.createdAt} >= ${startDate}`,
            sql`${feedback.createdAt} <= ${endDate}`
        );
    }

    return await db
        .select({
            id: feedback.id,
            fromHouseholdId: feedback.fromHouseholdId,
            toCollectorId: feedback.toCollectorId,
            rating: feedback.rating,
            remarks: feedback.remarks,
            createdAt: feedback.createdAt,
            householdUid: households.uid,
            headName: households.headName,
            houseNumber: households.houseNumber,
            collectorName: collectors.name,
            collectorUid: collectors.uid,
        })
        .from(feedback)
        .innerJoin(households, eq(feedback.fromHouseholdId, households.id))
        .innerJoin(collectors, eq(feedback.toCollectorId, collectors.id))
        .where(baseConditions.length > 1 ? and(...baseConditions) : baseConditions[0])
        .orderBy(desc(feedback.createdAt));
}
