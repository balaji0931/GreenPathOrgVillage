import {
    villages,
    households,
    collectors,
    wasteCollections,
} from "@shared/schema";
import { db } from "../db";
import { eq, count, and, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../cache";

export async function getDailyReportData(villageId?: string, date?: string): Promise<{
    totalHouses: number;
    collected: number;
    remaining: number;
    avgSegregationRating: number;
    ratingDistribution: any[];
    collectionTimeline: any[];
    villagePerformance: any[];
}> {
    const cache = getCache();
    const dateKey = date || new Date().toISOString().split('T')[0];
    const villageKey = villageId || 'all';
    const cacheKey = cacheKeys.dailyReport(villageKey, dateKey);

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const villageCondition = villageId && villageId !== 'all'
        ? eq(households.villageId, villageId)
        : sql`1=1`;

    const dateCondition = sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`;

    const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`);

    const [collectionsCount] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(and(dateCondition, villageCondition));

    // Average rating for the day
    const [avgRating] = await db
        .select({
            avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
                villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
            )
        );

    // Rating distribution
    const ratingDistribution = await db
        .select({
            rating: wasteCollections.segregationRating,
            count: count(),
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
                villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`,
                sql`${wasteCollections.segregationRating} IS NOT NULL`
            )
        )
        .groupBy(wasteCollections.segregationRating)
        .orderBy(wasteCollections.segregationRating);

    // Collection timeline (hourly breakdown)
    const timeline = await db
        .select({
            hour: sql<number>`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`,
            collections: count(),
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
                villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
            )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`);

    // Composting data (assuming we have waste segregation data)
    const compostingStats = await db
        .select({
            composting: count(sql`CASE WHEN ${wasteCollections.segregationRating} >= 4 THEN 1 END`),
            notComposting: count(sql`CASE WHEN ${wasteCollections.segregationRating} < 4 OR ${wasteCollections.segregationRating} IS NULL THEN 1 END`),
            total: count()
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
                villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
            ));

    // Village/Collector performance
    let performanceQuery;
    if (villageId && villageId !== 'all') {
        // Show collector performance for specific village
        performanceQuery = db
            .select({
                name: collectors.name,
                collections: count(wasteCollections.id),
                avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
            .where(
                and(
                    eq(households.villageId, villageId),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            )
            .groupBy(collectors.id, collectors.name)
            .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);
    } else {
        // Show village performance
        performanceQuery = db
            .select({
                name: villages.name,
                collections: count(wasteCollections.id),
                avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(villages, eq(households.villageId, villages.villageId))
            .where(
                sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
            )
            .groupBy(villages.villageId, villages.name)
            .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);
    }

    const performance = await performanceQuery;

    // Safely convert avgRating to number
    const dailyAvgRating = Number(avgRating.avg) || 0;

    const result = {
        totalHouses: householdsCount.count,
        collected: collectionsCount.count,
        remaining: householdsCount.count - collectionsCount.count,
        avgSegregationRating: parseFloat(dailyAvgRating.toFixed(2)),
        ratingDistribution,
        collectionTimeline: timeline,
        villagePerformance: performance.map(p => ({
            ...p,
            avgRating: parseFloat((Number(p.avgRating) || 0).toFixed(2))
        })),
        compostingData: compostingStats[0] || { composting: 0, notComposting: 0, total: 0 },
    };

    await cache.set(cacheKey, result, 300);
    return result;
}
