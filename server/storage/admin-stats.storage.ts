import {
    villages,
    users,
    households,
    collectors,
    wasteCollections,
    issues,
    type User,
    type Village,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, count, gte, lte, and, or, like, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../cache";
import * as villageStorage from "./village.storage";
import * as householdStorage from "./household.storage";
import * as collectorStorage from "./collector.storage";
import * as issueStorage from "./issue.storage";

export async function getVillageStats(villageId: string): Promise<{
    totalHouseholds: number;
    totalCollectors: number;
    openIssues: number;
    collectionsToday: number;
}> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.villageStats(villageId));
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(eq(households.villageId, villageId));

    const [collectorsCount] = await db
        .select({ count: count() })
        .from(collectors)
        .where(eq(collectors.villageId, villageId));

    const [openIssuesCount] = await db
        .select({ count: count() })
        .from(issues)
        .where(and(eq(issues.villageId, villageId), eq(issues.status, "open")));

    const [collectionsToday] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                eq(households.villageId, villageId),
                sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
            )
        );

    const stats = {
        totalHouseholds: householdsCount.count,
        totalCollectors: collectorsCount.count,
        openIssues: openIssuesCount.count,
        collectionsToday: collectionsToday.count,
    };

    await cache.set(cacheKeys.villageStats(villageId), stats, 300); // 5 min TTL for stats
    return stats;
}

export async function getAdminStats(): Promise<{
    totalVillages: number;
    totalManagers: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
}> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [villagesCount] = await db
        .select({ count: count() })
        .from(villages);

    const [managersCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "manager"));

    const [openIssuesCount] = await db
        .select({ count: count() })
        .from(issues)
        .where(eq(issues.status, "open"));

    const [collectionsToday] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .where(
            sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
        );

    return {
        totalVillages: villagesCount.count,
        totalManagers: managersCount.count,
        totalOpenIssues: openIssuesCount.count,
        totalCollectionsToday: collectionsToday.count,
    };
}

export async function getManagersList(): Promise<User[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.managers();
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db.select()
        .from(users)
        .where(eq(users.role, 'manager'))
        .limit(500); // Safety limit

    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
}

export async function getManagersListPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    villageId?: string;
} = {}): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.managersPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search && !options.villageId) return cached;

    let conditions = [eq(users.role, 'manager')];

    if (options.villageId) {
        conditions.push(eq(users.villageId, options.villageId));
    }

    if (options.search) {
        conditions.push(
            or(
                like(users.name, `%${options.search}%`),
                like(users.userId, `%${options.search}%`)
            )!
        );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

    const data = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(users.userId)
        .limit(limit)
        .offset(offset);

    const result = {
        data,
        total: countResult.count,
        page,
        limit,
        totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search && !options.villageId) {
        await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
}

export async function generateReport(filters: {
    village?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
}): Promise<any> {
    try {
        const cache = getCache();
        const cacheKey = cacheKeys.generateReport(
            filters.village || 'all',
            filters.startDate?.toISOString() || 'all',
            filters.endDate?.toISOString() || 'all'
        );

        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
        const allVillages = await db.select().from(villages);

        let result: any = { collections: [] };

        const villageStatsPromises: any[] = [];

        for (const village of allVillages) {
            // Apply village filter
            if (filters.village && filters.village !== village.villageId) {
                continue;
            }

            // Get monthly stats from summary table for past months
            if (filters.startDate) {
                const startMonth = filters.startDate.getFullYear() + '-' + String(filters.startDate.getMonth() + 1).padStart(2, '0');
                const endMonth = filters.endDate
                    ? filters.endDate.getFullYear() + '-' + String(filters.endDate.getMonth() + 1).padStart(2, '0')
                    : currentMonth;

                // Get stats from live waste_collections data for all months in range
                let statsQuery = db
                    .select({
                        villageId: households.villageId,
                        collections: count(wasteCollections.id),
                        avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
                        avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
                    })
                    .from(wasteCollections)
                    .innerJoin(households, eq(wasteCollections.householdId, households.id))
                    .where(
                        and(
                            eq(households.villageId, village.villageId),
                            gte(wasteCollections.collectionDate, new Date(`${startMonth}-01`)),
                            lte(wasteCollections.collectionDate, new Date(`${endMonth}-01`))
                        )
                    )
                    .groupBy(households.villageId);

                villageStatsPromises.push(statsQuery);
            }

            // Get live data for current month (real-time data)
            const monthStart = new Date(currentMonth + '-01');
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

            let liveQuery = db
                .select({
                    villageId: households.villageId,
                    collections: count(wasteCollections.id),
                    avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
                    avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
                })
                .from(wasteCollections)
                .innerJoin(households, eq(wasteCollections.householdId, households.id))
                .where(
                    and(
                        eq(households.villageId, village.villageId),
                        gte(wasteCollections.collectionDate, monthStart),
                        lte(wasteCollections.collectionDate, monthEnd)
                    )
                )
                .groupBy(households.villageId);

            villageStatsPromises.push(liveQuery);
        }

        // Combine results from all queries
        const allStats = await Promise.all(villageStatsPromises);
        const collectionsByVillage: { [key: string]: any } = {};

        for (const statsArray of allStats) {
            for (const stat of statsArray) {
                const villageId = stat.villageId;
                if (!collectionsByVillage[villageId]) {
                    const village = allVillages.find(v => v.villageId === villageId);
                    collectionsByVillage[villageId] = {
                        villageId,
                        villageName: village?.name || 'Unknown',
                        collections: 0,
                        avgSegregationRating: 0,
                        avgPlasticRating: 0,
                    };
                }

                // Aggregate stats
                collectionsByVillage[villageId].collections += Number(stat.collections) || 0;
                if (stat.avgSegregationRating) {
                    collectionsByVillage[villageId].avgSegregationRating = Number(stat.avgSegregationRating) || 0;
                }
                if (stat.avgPlasticRating) {
                    collectionsByVillage[villageId].avgPlasticRating = Number(stat.avgPlasticRating) || 0;
                }
            }
        }

        result.collections = Object.values(collectionsByVillage).map(item => ({
            ...item,
            avgSegregationRating: parseFloat((Number(item.avgSegregationRating) || 0).toFixed(2)),
            avgPlasticRating: parseFloat((Number(item.avgPlasticRating) || 0).toFixed(2)),
            collections: Number(item.collections) || 0
        }));

        await cache.set(cacheKey, result, 300); // 5 min cache
        return result;
    } catch (error) {
        console.error("Generate report error:", error);
        return { collections: [] };
    }
}

export async function getVillageDetails(villageId: string): Promise<any> {
    const cache = getCache();
    const cacheKey = cacheKeys.villageDetails(villageId);

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Run all queries in parallel for better performance
    const [
        village,
        stats,
        managers,
        householdsResult,
        collectorsResult,
        issuesResult,
    ] = await Promise.all([
        villageStorage.getVillageByVillageId(villageId),
        getVillageStats(villageId),
        db.select().from(users)
            .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')))
            .limit(1500), // Bounded
        householdStorage.getHouseholdsByVillagePaginated(villageId, { page: 1, limit: 1600 }),
        collectorStorage.getCollectorsByVillagePaginated(villageId, { page: 1, limit: 50 }),
        issueStorage.getIssuesByVillagePaginated(villageId, { page: 1, limit: 50 }),
    ]);

    const result = {
        village,
        stats,
        managers,
        households: householdsResult.data,
        householdsTotal: householdsResult.total,
        collectors: collectorsResult.data,
        collectorsTotal: collectorsResult.total,
        issues: issuesResult.data,
        issuesTotal: issuesResult.total,
    };

    await cache.set(cacheKey, result, 300); // 5 min cache
    return result;
}
