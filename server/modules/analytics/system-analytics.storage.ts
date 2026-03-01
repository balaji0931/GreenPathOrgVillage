import {
    villages,
    households,
    collectors,
    wasteCollections,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function getSystemAnalytics(villageFilter?: string): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalCollectionsToday: number;
    totalCollectionsThisWeek: number;
    averageSegregationRating: number;
    topPerformingVillages: any[];
    collectionTrends: any[];
    segregationRateDistribution: any;
}> {
    try {
        const cache = getCache();
        const cacheKey = cacheKeys.adminStats() + (villageFilter ? `:${villageFilter}` : '');

        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Apply village filter where needed
        const villageCondition = villageFilter && villageFilter !== 'all' ? eq(households.villageId, villageFilter) : sql`1=1`;
        const collectorVillageCondition = villageFilter && villageFilter !== 'all' ? eq(collectors.villageId, villageFilter) : sql`1=1`;
        const villageFilterCondition = villageFilter && villageFilter !== 'all' ? eq(villages.villageId, villageFilter) : sql`1=1`;

        const [villagesCount] = await db
            .select({ count: count() })
            .from(villages)
            .where(villageFilterCondition);

        const [householdsCount] = await db
            .select({ count: count() })
            .from(households)
            .where(villageCondition);

        const [collectorsCount] = await db
            .select({ count: count() })
            .from(collectors)
            .where(collectorVillageCondition);

        const [collectionsToday] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`,
                    villageCondition
                )
            );

        const [collectionsThisWeek] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`,
                    villageCondition
                )
            );

        const [avgSegregation] = await db.select({
            avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(and(villageCondition, sql`${wasteCollections.segregationRating} IS NOT NULL`));

        // Use live waste_collections data for top villages
        const topVillages = await db.select({
            villageName: villages.name,
            avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
            collections: count(wasteCollections.id)
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(villages, eq(households.villageId, villages.villageId))
            .where(villageFilterCondition)
            .groupBy(villages.villageId, villages.name)
            .orderBy(desc(sql`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`))
            .limit(5);

        // Get last 7 days trends from live data
        const collectionTrends = await db.select({
            date: sql<string>`DATE(${wasteCollections.collectionDate})`,
            collections: count(wasteCollections.id),
            avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(villageCondition)
            .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
            .orderBy(desc(sql`DATE(${wasteCollections.collectionDate})`))
            .limit(7);

        const segregationDistribution = await db.select({
            rating: wasteCollections.segregationRating,
            count: count()
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    sql`${wasteCollections.segregationRating} IS NOT NULL`,
                    villageCondition
                )
            )
            .groupBy(wasteCollections.segregationRating)
            .orderBy(wasteCollections.segregationRating);

        // Safely convert avgSegregation to number
        const avgRating = Number(avgSegregation?.avg) || 0;

        const result = {
            totalVillages: Number(villagesCount?.count) || 0,
            totalHouseholds: Number(householdsCount?.count) || 0,
            totalCollectors: Number(collectorsCount?.count) || 0,
            totalCollectionsToday: Number(collectionsToday?.count) || 0,
            totalCollectionsThisWeek: Number(collectionsThisWeek?.count) || 0,
            averageSegregationRating: parseFloat(avgRating.toFixed(2)),
            topPerformingVillages: topVillages.map(v => ({
                ...v,
                avgRating: parseFloat((Number(v.avgRating) || 0).toFixed(2)),
                collections: Number(v.collections) || 0
            })),
            collectionTrends: collectionTrends.map(t => ({
                ...t,
                avgRating: parseFloat((Number(t.avgRating) || 0).toFixed(2)),
                collections: Number(t.collections) || 0
            })),
            segregationRateDistribution: segregationDistribution.map(s => ({
                rating: Number(s.rating) || 0,
                count: Number(s.count) || 0
            })),
        };

        await cache.set(cacheKey, result, 300); // 5 min cache
        return result;
    } catch (error) {
        console.error("Get system analytics error:", error);
        return {
            totalVillages: 0,
            totalHouseholds: 0,
            totalCollectors: 0,
            totalCollectionsToday: 0,
            totalCollectionsThisWeek: 0,
            averageSegregationRating: 0,
            topPerformingVillages: [],
            collectionTrends: [],
            segregationRateDistribution: [],
        };
    }
}
