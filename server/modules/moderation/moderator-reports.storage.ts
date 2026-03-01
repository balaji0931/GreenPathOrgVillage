import {
    villages,
    households,
    collectors,
    wasteCollections,
    issues,
    type Issue,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, count, and, sql, inArray } from "drizzle-orm";

// =====================================================
// MODERATOR REPORTS & ANALYTICS OPERATIONS
// =====================================================

export async function getModeratorReports(villageIds: string[], filters: {
    startDate?: Date;
    endDate?: Date;
}): Promise<any> {
    if (villageIds.length === 0) {
        return { collections: [] };
    }

    try {

        let whereConditions: any[] = [inArray(households.villageId, villageIds)];

        if (filters.startDate) {
            whereConditions.push(sql`${wasteCollections.collectionDate} >= ${filters.startDate}`);
        }
        if (filters.endDate) {
            whereConditions.push(sql`${wasteCollections.collectionDate} <= ${filters.endDate}`);
        }

        const collectionsQuery = db
            .select({
                villageId: households.villageId,
                villageName: villages.name,
                collections: sql<number>`COUNT(${wasteCollections.id})`,
                avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
                avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(villages, eq(households.villageId, villages.villageId))
            .where(and(...whereConditions))
            .groupBy(households.villageId, villages.name);

        const collectionsData = await collectionsQuery;

        const formattedCollections = collectionsData.map(item => ({
            ...item,
            avgSegregationRating: parseFloat((Number(item.avgSegregationRating) || 0).toFixed(2)),
            avgPlasticRating: parseFloat((Number(item.avgPlasticRating) || 0).toFixed(2)),
            collections: Number(item.collections) || 0
        }));

        return {
            collections: formattedCollections,
        };
    } catch (error) {
        console.error("Generate moderator report error:", error);
        return { collections: [] };
    }
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

export async function getModeratorSystemAnalytics(villageIds: string[], selectedVillageId?: string): Promise<{
    totalCollections: number;
    avgRating: number;
    villageStats: any[];
    totalCollectionsThisWeek: number;
    averageSegregationRating: number;
    topPerformingVillages: any[];
    collectionTrends: any[];
    segregationRateDistribution: any[];
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalCollectionsToday: number;
}> {
    // Filter villageIds based on selectedVillageId if provided
    const targetVillageIds = selectedVillageId && selectedVillageId !== 'all'
        ? [selectedVillageId].filter(id => villageIds.includes(id))
        : villageIds;

    if (targetVillageIds.length === 0) {
        // Return default structure with empty data but valid 7-day trends
        const emptyCollectionTrends = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            emptyCollectionTrends.push({
                date: dateStr,
                collectionDate: dateStr,
                collections: 0,
                totalHouseholds: 0,
                avgRating: 0
            });
        }

        return {
            totalCollections: 0,
            avgRating: 0,
            villageStats: [],
            totalCollectionsThisWeek: 0,
            averageSegregationRating: 0,
            topPerformingVillages: [],
            collectionTrends: emptyCollectionTrends,
            segregationRateDistribution: [],
            totalVillages: 0,
            totalHouseholds: 0,
            totalCollectors: 0,
            totalCollectionsToday: 0,
        };
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Basic counts
        const [collectionsCount] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(inArray(households.villageId, targetVillageIds));

        const [householdsCount] = await db
            .select({ count: count() })
            .from(households)
            .where(inArray(households.villageId, targetVillageIds));

        const [collectorsCount] = await db
            .select({ count: count() })
            .from(collectors)
            .where(inArray(collectors.villageId, targetVillageIds));

        const [collectionsToday] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, targetVillageIds),
                    sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
                )
            );

        const [collectionsThisWeek] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, targetVillageIds),
                    sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`
                )
            );

        const [avgRating] = await db.select({
            avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(and(
                inArray(households.villageId, targetVillageIds),
                sql`${wasteCollections.segregationRating} IS NOT NULL`
            ));

        // Collection trends (last 7 days) - Get actual data with total households context
        const collectionTrendsData = await db.select({
            date: sql<string>`DATE(${wasteCollections.collectionDate})`,
            collections: count(wasteCollections.id),
            avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, targetVillageIds),
                    sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`
                )
            )
            .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
            .orderBy(sql`DATE(${wasteCollections.collectionDate})`);

        // Create complete 7-day collection trends with all dates and total households context
        const totalHouseholdsForTrends = Number(householdsCount?.count) || 0;
        const collectionTrends = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayData = collectionTrendsData.find(trend => trend.date === dateStr);
            collectionTrends.push({
                date: dateStr,
                collectionDate: dateStr,
                collections: Number(dayData?.collections) || 0,
                totalHouseholds: totalHouseholdsForTrends,
                avgRating: parseFloat((Number(dayData?.avgRating) || 0).toFixed(2))
            });
        }

        // Segregation rate distribution
        const segregationRateDistributionData = await db.select({
            rating: wasteCollections.segregationRating,
            count: count()
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, targetVillageIds),
                    sql`${wasteCollections.segregationRating} IS NOT NULL`
                )
            )
            .groupBy(wasteCollections.segregationRating)
            .orderBy(wasteCollections.segregationRating);

        // Top performing villages
        const villageStats = await db.select({
            villageId: households.villageId,
            villageName: villages.name,
            collections: count(wasteCollections.id),
            avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(villages, eq(households.villageId, villages.villageId))
            .where(inArray(households.villageId, targetVillageIds))
            .groupBy(households.villageId, villages.name)
            .orderBy(desc(sql`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`));

        const avgRatingValue = Number(avgRating?.avg) || 0;

        return {
            totalCollections: Number(collectionsCount?.count) || 0,
            avgRating: parseFloat(avgRatingValue.toFixed(2)),
            villageStats: villageStats.map(stat => ({
                ...stat,
                avgRating: parseFloat((Number(stat.avgRating) || 0).toFixed(2)),
                collections: Number(stat.collections) || 0
            })),
            totalCollectionsThisWeek: Number(collectionsThisWeek?.count) || 0,
            averageSegregationRating: parseFloat(avgRatingValue.toFixed(2)),
            topPerformingVillages: villageStats.slice(0, 5).map(stat => ({
                ...stat,
                avgRating: parseFloat((Number(stat.avgRating) || 0).toFixed(2)),
                collections: Number(stat.collections) || 0
            })),
            collectionTrends,
            segregationRateDistribution: segregationRateDistributionData.map(item => ({
                rating: Number(item.rating) || 0,
                count: Number(item.count) || 0
            })),
            totalVillages: targetVillageIds.length,
            totalHouseholds: totalHouseholdsForTrends,
            totalCollectors: Number(collectorsCount?.count) || 0,
            totalCollectionsToday: Number(collectionsToday?.count) || 0,
        };
    } catch (error) {
        console.error("Get moderator system analytics error:", error);

        // Return default structure with empty 7-day trends on error
        const emptyCollectionTrends = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            emptyCollectionTrends.push({
                date: dateStr,
                collectionDate: dateStr,
                collections: 0,
                totalHouseholds: 0,
                avgRating: 0
            });
        }

        return {
            totalCollections: 0,
            avgRating: 0,
            villageStats: [],
            totalCollectionsThisWeek: 0,
            averageSegregationRating: 0,
            topPerformingVillages: [],
            collectionTrends: emptyCollectionTrends,
            segregationRateDistribution: [],
            totalVillages: 0,
            totalHouseholds: 0,
            totalCollectors: 0,
            totalCollectionsToday: 0,
        };
    }
}

export async function getModeratorDailyReportData(villageIds: string[], date?: string): Promise<{
    totalHouses: number;
    collected: number;
    remaining: number;
    avgSegregationRating: number;
    ratingDistribution: any[];
    collectionTimeline: any[];
    villagePerformance: any[];
    compostingData: any;
}> {
    if (villageIds.length === 0) {
        return {
            totalHouses: 0,
            collected: 0,
            remaining: 0,
            avgSegregationRating: 0,
            ratingDistribution: [],
            collectionTimeline: [],
            villagePerformance: [],
            compostingData: { composting: 0, notComposting: 0, total: 0 },
        };
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
        const [householdsCount] = await db
            .select({ count: count() })
            .from(households)
            .where(inArray(households.villageId, villageIds));

        const [collectionsCount] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            );

        const [avgRating] = await db
            .select({
                avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
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
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
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
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            )
            .groupBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`)
            .orderBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`);

        // Village performance for the day
        const villagePerformance = await db
            .select({
                name: villages.name,
                collections: count(wasteCollections.id),
                avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .innerJoin(villages, eq(households.villageId, villages.villageId))
            .where(
                and(
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            )
            .groupBy(villages.villageId, villages.name)
            .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);

        // Composting data (assuming high segregation rating indicates composting)
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
                    inArray(households.villageId, villageIds),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            );

        return {
            totalHouses: householdsCount.count,
            collected: collectionsCount.count,
            remaining: householdsCount.count - collectionsCount.count,
            avgSegregationRating: parseFloat((Number(avgRating.avg) || 0).toFixed(2)),
            ratingDistribution,
            collectionTimeline: timeline,
            villagePerformance: villagePerformance.map(p => ({
                ...p,
                avgRating: parseFloat((Number(p.avgRating) || 0).toFixed(2))
            })),
            compostingData: compostingStats[0] || { composting: 0, notComposting: 0, total: 0 },
        };
    } catch (error) {
        console.error("Get moderator daily report data error:", error);
        return {
            totalHouses: 0,
            collected: 0,
            remaining: 0,
            avgSegregationRating: 0,
            ratingDistribution: [],
            collectionTimeline: [],
            villagePerformance: [],
            compostingData: { composting: 0, notComposting: 0, total: 0 },
        };
    }
}
