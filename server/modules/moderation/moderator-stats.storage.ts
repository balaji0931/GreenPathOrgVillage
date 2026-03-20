import {
    villages,
    households,
    collectors,
    issues,
    type Issue,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, count, and, sql, inArray } from "drizzle-orm";

// =====================================================
// MODERATOR OPERATIONAL STORAGE
// =====================================================

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

export async function getModeratorIssues(villageIds: string[]): Promise<Issue[]> {
    if (villageIds.length === 0) {
        return [];
    }

    return await db
        .select()
        .from(issues)
        .where(inArray(issues.villageId, villageIds))
        .orderBy(desc(issues.createdAt));
}
