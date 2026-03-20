import {
    wasteCollections,
    households,
    collectors,
    type WasteCollection,
    type InsertWasteCollection,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, asc, count, gte, lte, and, or, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function checkExistingCollection(householdId: number, collectorId: number, date: string) {
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const [existing] = await db
        .select({ id: wasteCollections.id })
        .from(wasteCollections)
        .where(
            and(
                eq(wasteCollections.householdId, householdId),
                eq(wasteCollections.collectorId, collectorId),
                and(
                    gte(wasteCollections.collectionDate, startDate),
                    lte(wasteCollections.collectionDate, endDate)
                )
            )
        )
        .limit(1);

    return existing;
}

export async function createWasteCollection(insertCollection: InsertWasteCollection & { latitude?: string, longitude?: string }): Promise<WasteCollection> {
    const cache = getCache();

    // Ensure numeric values for ratings
    const { latitude, longitude, ...rest } = insertCollection as any;
    const dbValues = {
        ...rest,
        segregationRating: Number(insertCollection.segregationRating),
    };

    const [collection] = await db
        .insert(wasteCollections)
        .values(dbValues)
        .returning();

    // Invalidate collections cache - lookup household to get villageId
    const [household] = await db.select({
        id: households.id,
        villageId: households.villageId,
        latitude: households.latitude,
        longitude: households.longitude,
    })
        .from(households)
        .where(eq(households.id, insertCollection.householdId))
        .limit(1);

    if (household) {
        // Store location for the first time if not already set
        if (!household.latitude && !household.longitude && latitude && longitude) {
            await db.update(households)
                .set({
                    latitude: latitude,
                    longitude: longitude
                })
                .where(eq(households.id, household.id));

            // Invalidate household cache
            await cache.delete(cacheKeys.households(household.villageId));
            const patterns = [`households:${household.villageId}:*`];
            for (const pattern of patterns) {
                await cache.clear(pattern);
            }
        }

        if (household.villageId) {
            await cache.delete(cacheKeys.wasteCollections(household.villageId));
            await cache.clear(`collections:${household.villageId}:*`);
            await cache.delete(cacheKeys.villageStats(household.villageId));
        }
    }

    return collection;
}

export async function getCollectionsByHousehold(householdId: number, options?: { limit?: number; offset?: number }): Promise<{
    data: any[];
    stats: { avgRating: number; totalCollections: number }
}> {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const data = await db
        .select({
            id: wasteCollections.id,
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            remarks: wasteCollections.remarks,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            status: wasteCollections.status,
            missedReason: wasteCollections.missedReason,
            householdId: wasteCollections.householdId,
            collectorId: wasteCollections.collectorId,
            collectorName: collectors.name,
        })
        .from(wasteCollections)
        .leftJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(eq(wasteCollections.householdId, householdId))
        .orderBy(desc(wasteCollections.collectionDate))
        .limit(limit)
        .offset(offset);

    const statsResult = await db
        .select({
            total: count(),
            avgRating: sql<number>`COALESCE(AVG(${wasteCollections.segregationRating}), 0)`,
        })
        .from(wasteCollections)
        .where(eq(wasteCollections.householdId, householdId));

    return {
        data,
        stats: {
            avgRating: Number(statsResult[0]?.avgRating || 0),
            totalCollections: statsResult[0]?.total || 0
        }
    };
}

export async function getCollectionsByCollector(collectorId: number, limit: number = 500): Promise<WasteCollection[]> {
    return await db
        .select({
            id: wasteCollections.id,
            householdId: wasteCollections.householdId,
            collectorId: wasteCollections.collectorId,
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            remarks: wasteCollections.remarks,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            status: wasteCollections.status,
            missedReason: wasteCollections.missedReason,
            wasteTypes: wasteCollections.wasteTypes,
            weightKg: wasteCollections.weightKg,
        })
        .from(wasteCollections)
        .where(eq(wasteCollections.collectorId, collectorId))
        .orderBy(desc(wasteCollections.collectionDate))
        .limit(limit);
}

export async function getCollectionById(collectionId: number): Promise<any> {
    const [collection] = await db
        .select({
            id: wasteCollections.id,
            householdId: wasteCollections.householdId,
            collectorId: wasteCollections.collectorId,
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            remarks: wasteCollections.remarks,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            status: wasteCollections.status,
            missedReason: wasteCollections.missedReason,
            wasteTypes: wasteCollections.wasteTypes,
            weightKg: wasteCollections.weightKg,
        })
        .from(wasteCollections)
        .where(eq(wasteCollections.id, collectionId))
        .limit(1);
    return collection;
}

export async function getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]> {
    let conditions = [eq(households.villageId, villageId)];

    if (date) {
        const [year, month, day] = date.split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0);
        const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        conditions.push(sql`${wasteCollections.collectionDate} >= ${startDate}`);
        conditions.push(sql`${wasteCollections.collectionDate} <= ${endDate}`);
    }

    if (householdId) {
        conditions.push(eq(wasteCollections.householdId, householdId));
    }

    return await db
        .select({
            id: wasteCollections.id,
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            remarks: wasteCollections.remarks,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            status: wasteCollections.status,
            missedReason: wasteCollections.missedReason,
            householdId: wasteCollections.householdId,
            householdUid: households.uid,
            headName: households.headName,
            houseNumber: households.houseNumber,
            collectorId: wasteCollections.collectorId,
            collectorName: collectors.name,
            collectorUid: collectors.uid,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(and(...conditions))
        .orderBy(desc(wasteCollections.collectionDate));
}

export async function getCollectionsByVillageWithDetailsPaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    date?: string;
    collectorId?: number;
    status?: string;
} = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(10000, Math.max(1, options.limit || 10000));
    const offset = (page - 1) * limit;

    let conditions = [eq(households.villageId, villageId)];

    if (options.date) {
        const [year, month, day] = options.date.split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0);
        const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        conditions.push(sql`${wasteCollections.collectionDate} >= ${startDate}`);
        conditions.push(sql`${wasteCollections.collectionDate} <= ${endDate}`);
    }

    if (options.collectorId) {
        conditions.push(eq(wasteCollections.collectorId, options.collectorId));
    }

    if (options.status && options.status !== 'all') {
        conditions.push(eq(wasteCollections.status, options.status));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(whereClause);

    const data = await db
        .select({
            id: wasteCollections.id,
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            remarks: wasteCollections.remarks,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            status: wasteCollections.status,
            missedReason: wasteCollections.missedReason,
            householdId: wasteCollections.householdId,
            householdUid: households.uid,
            headName: households.headName,
            houseNumber: households.houseNumber,
            collectorId: wasteCollections.collectorId,
            collectorName: collectors.name,
            collectorUid: collectors.uid,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(whereClause)
        .orderBy(desc(wasteCollections.collectionDate))
        .limit(limit)
        .offset(offset);

    return {
        data,
        total: countResult.count,
        page,
        limit,
        totalPages: Math.ceil(countResult.count / limit)
    };
}

export async function getDailyCollectionSummary(villageId: string, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Single query: all households LEFT JOIN collections for the given date
    const rows = await db
        .select({
            householdId: households.id,
            uid: households.uid,
            headName: households.headName,
            houseNumber: households.houseNumber,
            ward: households.ward,
            phone: households.phone,
            latitude: households.latitude,
            longitude: households.longitude,
            collectionId: wasteCollections.id,
            segregationRating: wasteCollections.segregationRating,
            photoUrl: wasteCollections.photoUrl,
            voiceUrl: wasteCollections.voiceUrl,
            collectionDate: wasteCollections.collectionDate,
            collectorName: collectors.name,
        })
        .from(households)
        .leftJoin(
            wasteCollections,
            and(
                eq(wasteCollections.householdId, households.id),
                sql`${wasteCollections.collectionDate} >= ${startDate}`,
                sql`${wasteCollections.collectionDate} <= ${endDate}`
            )
        )
        .leftJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(
            and(
                eq(households.villageId, villageId),
                or(
                    eq(households.status, 'active'),
                    and(
                        eq(households.status, 'deleted'),
                        sql`${households.updatedAt} >= ${startDate}`
                    )
                )
            )
        )
        .orderBy(asc(households.headName));

    const collectedRows = rows.filter(r => r.collectionId !== null);

    const needsAttention = collectedRows
        .filter(r => (r.segregationRating || 0) <= 3)
        .map(r => ({
            householdId: r.householdId,
            uid: r.uid,
            headName: r.headName,
            houseNumber: r.houseNumber,
            ward: r.ward,
            phone: r.phone,
            latitude: r.latitude,
            longitude: r.longitude,
            segregationRating: r.segregationRating || 0,
            photoUrl: r.photoUrl || null,
            voiceUrl: r.voiceUrl || null,
            collectorName: r.collectorName || '',
        }));

    const householdList = rows.map(r => ({
        id: r.householdId,
        uid: r.uid,
        headName: r.headName,
        houseNumber: r.houseNumber,
        ward: r.ward,
        phone: r.phone,
        latitude: r.latitude,
        longitude: r.longitude,
        collected: r.collectionId !== null,
        segregationRating: r.segregationRating || null,
        collectorName: r.collectorName || null,
        collectionPhotoUrl: r.photoUrl || null,
        collectionVoiceUrl: r.voiceUrl || null,
        collectionTime: r.collectionDate ? new Date(r.collectionDate).toLocaleTimeString() : null,
    }));

    return {
        date,
        needsAttention,
        households: householdList,
    };
}

export async function getRecentCollectionsByVillage(villageId: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db
        .select({
            collectionDate: sql<string>`DATE(${wasteCollections.collectionDate})`,
            collections: count(wasteCollections.id),
            avgSegregationRating: sql<number>`COALESCE(AVG(${wasteCollections.segregationRating}), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
            and(
                eq(households.villageId, villageId),
                sql`${wasteCollections.collectionDate} >= ${startDate}`
            )
        )
        .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
        .orderBy(sql`DATE(${wasteCollections.collectionDate})`);
}
