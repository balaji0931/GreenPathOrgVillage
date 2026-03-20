import {
    collectors,
    wasteCollections,
    feedback,
    type Collector,
    type InsertCollector,
} from "@shared/schema";
import { db } from "../../db";
import { eq, count, and, or, like } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function createCollector(insertCollector: InsertCollector): Promise<Collector> {
    const cache = getCache();
    const [collector] = await db
        .insert(collectors)
        .values(insertCollector)
        .returning();

    // Invalidate collector caches
    await cache.delete(cacheKeys.collectors(insertCollector.villageId));
    await cache.clear(`collectors:${insertCollector.villageId}:*`);

    await cache.delete(cacheKeys.villageStats(insertCollector.villageId));

    return collector;
}

export async function getCollectorsByVillage(villageId: string): Promise<Collector[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.collectors(villageId));
    if (cached) return cached;

    const result = await db
        .select({
            id: collectors.id,
            uid: collectors.uid,
            villageId: collectors.villageId,
            name: collectors.name,
            phone: collectors.phone,
            assignedVehicle: collectors.assignedVehicle,
            createdAt: collectors.createdAt,
        })
        .from(collectors)
        .where(eq(collectors.villageId, villageId))
        .orderBy(collectors.uid)
        .limit(500);

    await cache.set(cacheKeys.collectors(villageId), result, 1800); // 30 min TTL
    return result;
}

export async function getCollectorsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
} = {}): Promise<{ data: Collector[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.collectorsPaginated(villageId, page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search) return cached;

    let conditions = [eq(collectors.villageId, villageId)];

    if (options.search) {
        conditions.push(
            or(
                like(collectors.name, `%${options.search}%`),
                like(collectors.uid, `%${options.search}%`)
            )!
        );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
        .select({ count: count() })
        .from(collectors)
        .where(whereClause);

    const data = await db
        .select({
            id: collectors.id,
            uid: collectors.uid,
            villageId: collectors.villageId,
            name: collectors.name,
            phone: collectors.phone,
            assignedVehicle: collectors.assignedVehicle,
            createdAt: collectors.createdAt,
        })
        .from(collectors)
        .where(whereClause)
        .orderBy(collectors.uid)
        .limit(limit)
        .offset(offset);

    const result = {
        data,
        total: countResult.count,
        page,
        limit,
        totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search) {
        await cache.set(cacheKey, result, 900); // 15 min TTL
    }
    return result;
}

export async function getCollectorByUid(uid: string): Promise<Collector | undefined> {
    const [collector] = await db.select({
        id: collectors.id,
        uid: collectors.uid,
        villageId: collectors.villageId,
        name: collectors.name,
        phone: collectors.phone,
        assignedVehicle: collectors.assignedVehicle,
        createdAt: collectors.createdAt,
    }).from(collectors).where(eq(collectors.uid, uid));
    return collector || undefined;
}

export async function deleteCollector(id: number): Promise<void> {
    const cache = getCache();
    // Get villageId before deleting
    const [collector] = await db.select({ villageId: collectors.villageId })
        .from(collectors)
        .where(eq(collectors.id, id))
        .limit(1);

    await db.delete(collectors).where(eq(collectors.id, id));

    // Invalidate collector caches
    if (collector?.villageId) {
        await cache.delete(cacheKeys.collectors(collector.villageId));
        await cache.clear(`collectors:${collector.villageId}:*`);
        await cache.delete(cacheKeys.villageStats(collector.villageId));

    }
}

export async function getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    complaintsCount: number;
}> {
    // Get total collections
    const [collectionCount] = await db.select({ count: count() })
        .from(wasteCollections)
        .where(eq(wasteCollections.collectorId, collectorId));


    const feedbackResults = await db.select({ rating: feedback.rating })
        .from(feedback)
        .where(eq(feedback.toCollectorId, collectorId));

    const avgRating = feedbackResults.length > 0
        ? feedbackResults.reduce((sum, f) => sum + f.rating, 0) / feedbackResults.length
        : 0;


    return {
        totalCollections: collectionCount.count || 0,
        averageRating: avgRating,
        complaintsCount: 0,
    };
}
