import {
    villages,
    users,
    households,
    collectors,
    wasteCollections,
    issues,
    type User,
} from "@shared/schema";
import { db } from "../../db";
import { eq, count, gte, and, or, like, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";
import * as villageStorage from "../village/village.storage";
import * as householdStorage from "../household/household.storage";
import * as collectorStorage from "../collector/collector.storage";
import * as issueStorage from "../issue/issue.storage";

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
                gte(wasteCollections.collectionDate, today),
                sql`${wasteCollections.collectionDate} < ${tomorrow}`
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
