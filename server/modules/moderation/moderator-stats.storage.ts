import {
    villages,
    households,
    collectors,
    wasteCollections,
    issues,
} from "@shared/schema";
import { db } from "../../db";
import { eq, count, and, sql, inArray } from "drizzle-orm";

// =====================================================
// MODERATOR STATS OPERATIONS
// =====================================================

export async function getModeratorStats(villageIds: string[]): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
}> {
    if (villageIds.length === 0) {
        return {
            totalVillages: 0,
            totalHouseholds: 0,
            totalCollectors: 0,
            totalOpenIssues: 0,
            totalCollectionsToday: 0,
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(inArray(households.villageId, villageIds));

    const [collectorsCount] = await db
        .select({ count: count() })
        .from(collectors)
        .where(inArray(collectors.villageId, villageIds));

    const [openIssuesCount] = await db
        .select({ count: count() })
        .from(issues)
        .where(and(
            inArray(issues.villageId, villageIds),
            eq(issues.status, "open")
        ));

    const [collectionsToday] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                inArray(households.villageId, villageIds),
                sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
            )
        );

    return {
        totalVillages: villageIds.length,
        totalHouseholds: householdsCount.count,
        totalCollectors: collectorsCount.count,
        totalOpenIssues: openIssuesCount.count,
        totalCollectionsToday: collectionsToday.count,
    };
}

export async function getModeratorCollectors(villageIds: string[]): Promise<any[]> {
    if (villageIds.length === 0) {
        return [];
    }

    return await db
        .select({
            id: collectors.id,
            uid: collectors.uid,
            name: collectors.name,
            phone: collectors.phone,
            villageId: collectors.villageId,
            villageName: villages.name,
        })
        .from(collectors)
        .innerJoin(villages, eq(collectors.villageId, villages.villageId))
        .where(inArray(collectors.villageId, villageIds))
        .orderBy(collectors.uid);
}

export async function getModeratorHouseholds(villageIds: string[]): Promise<any[]> {
    if (villageIds.length === 0) {
        return [];
    }

    return await db
        .select({
            id: households.id,
            uid: households.uid,
            headName: households.headName,
            phone: households.phone,
            houseNumber: households.houseNumber,
            villageId: households.villageId,
            villageName: villages.name,
        })
        .from(households)
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(inArray(households.villageId, villageIds))
        .orderBy(households.uid);
}
