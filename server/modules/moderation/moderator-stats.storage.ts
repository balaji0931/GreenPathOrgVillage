import {
    villages,
    households,
    collectors,
    issues,
    users,
    dailyVillageStats,
    type Issue,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, count, and, sql, inArray } from "drizzle-orm";

// =====================================================
// MODERATOR OPERATIONAL STORAGE
// =====================================================

/**
 * Get overview stats for moderator's assigned villages.
 * Uses PRE-AGGREGATED dailyVillageStats table — no raw collection scans.
 * Returns per-village breakdown + territory aggregates in a single query batch.
 */
export async function getModeratorOverviewStats(villageIds: string[], date: string) {
    if (villageIds.length === 0) {
        return { aggregate: { totalVillages: 0, totalHouseholds: 0, collectionsToday: 0, notCollectedToday: 0, avgRating: 0, openIssues: 0 }, villages: [] };
    }

    // 1. Pre-aggregated village stats for today (one row per village, already upserted by collection flow)
    const statsRows = await db
        .select({
            villageId: dailyVillageStats.villageId,
            totalHouseholds: dailyVillageStats.totalHouseholds,
            collectedCount: dailyVillageStats.collectedCount,
            segregationSum: dailyVillageStats.segregationSum,
        })
        .from(dailyVillageStats)
        .where(and(
            inArray(dailyVillageStats.villageId, villageIds),
            eq(dailyVillageStats.reportDate, date),
        ));

    // 2. Village metadata (name, unitType, totalHouseholds from villages table as fallback)
    const villageMeta = await db
        .select({
            villageId: villages.villageId,
            name: villages.name,
            unitType: villages.unitType,
            totalHouseholds: villages.totalHouseholds,
        })
        .from(villages)
        .where(inArray(villages.villageId, villageIds));

    // 3. Open issues count per village (single grouped query)
    const issueRows = await db
        .select({
            villageId: issues.villageId,
            openCount: count(),
        })
        .from(issues)
        .where(and(
            inArray(issues.villageId, villageIds),
            eq(issues.status, 'open'),
        ))
        .groupBy(issues.villageId);

    // 4. Manager name + phone per village — first (lowest ID) manager per village
    const managerRows = await db
        .select({
            id: users.id,
            villageId: users.villageId,
            name: users.name,
            phone: users.phone,
        })
        .from(users)
        .where(and(
            inArray(users.villageId, villageIds),
            eq(users.role, 'manager'),
        ))
        .orderBy(users.id);

    // Build lookup maps
    const statsMap = new Map(statsRows.map(r => [r.villageId, r]));
    const issueMap = new Map(issueRows.map(r => [r.villageId, Number(r.openCount)]));
    // Keep only the first (lowest ID) manager per village
    const managerMap = new Map<string, { name: string | null; phone: string | null }>();
    for (const r of managerRows) {
        if (r.villageId && !managerMap.has(r.villageId)) {
            managerMap.set(r.villageId, { name: r.name, phone: r.phone });
        }
    }

    // Assemble per-village data
    let aggHH = 0, aggCollected = 0, aggNotCollected = 0, aggSegSum = 0, aggSegCount = 0, aggIssues = 0;

    const villageList = villageMeta.map(v => {
        const stats = statsMap.get(v.villageId);
        const totalHH = stats?.totalHouseholds || v.totalHouseholds || 0;
        const collected = stats?.collectedCount || 0;
        const notCollected = Math.max(0, totalHH - collected);
        const segSum = stats ? parseFloat(String(stats.segregationSum)) : 0;
        const avgRating = collected > 0 ? Math.round((segSum / collected) * 10) / 10 : 0;
        const openIssues = issueMap.get(v.villageId) || 0;
        const manager = managerMap.get(v.villageId);
        const collectionRate = totalHH > 0 ? Math.round((collected / totalHH) * 1000) / 10 : 0;

        aggHH += totalHH;
        aggCollected += collected;
        aggNotCollected += notCollected;
        aggSegSum += segSum;
        aggSegCount += collected;
        aggIssues += openIssues;

        return {
            villageId: v.villageId,
            name: v.name,
            unitType: v.unitType || 'gram_panchayat',
            totalHouseholds: totalHH,
            collectionsToday: collected,
            notCollectedToday: notCollected,
            collectionRate,
            avgRating,
            openIssues,
            managerName: manager?.name || null,
            managerPhone: manager?.phone || null,
        };
    });

    // Sort worst-first (lowest collection rate floats up)
    villageList.sort((a, b) => a.collectionRate - b.collectionRate);

    return {
        aggregate: {
            totalVillages: villageMeta.length,
            totalHouseholds: aggHH,
            collectionsToday: aggCollected,
            notCollectedToday: aggNotCollected,
            avgRating: aggSegCount > 0 ? Math.round((aggSegSum / aggSegCount) * 10) / 10 : 0,
            openIssues: aggIssues,
        },
        villages: villageList,
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
