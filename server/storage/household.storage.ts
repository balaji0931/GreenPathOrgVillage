import {
    households,
    wasteCollections,
    qrCodes,
    feedback,
    type Household,
    type InsertHousehold,
} from "@shared/schema";
import { db } from "../db";
import { eq, count, and, or, like } from "drizzle-orm";
import { getCache, cacheKeys } from "../cache";

export async function createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const cache = getCache();
    const [household] = await db
        .insert(households)
        .values(insertHousehold)
        .returning();

    // Invalidate households cache
    await cache.delete(cacheKeys.households(insertHousehold.villageId));
    await cache.clear(`households:${insertHousehold.villageId}:*`);
    await cache.delete(cacheKeys.villageDetails(insertHousehold.villageId));
    await cache.delete(cacheKeys.villageStats(insertHousehold.villageId));

    return household;
}

export async function getHouseholdsByVillage(villageId: string): Promise<Household[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.households(villageId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db
        .select()
        .from(households)
        .where(eq(households.villageId, villageId))
        .orderBy(households.uid)
        .limit(5000); // Safety limit - use paginated method for larger datasets

    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
}

export async function getHouseholdsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    ward?: string;
    status?: string;
} = {}): Promise<{ data: Household[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(2000, Math.max(1, options.limit || 2000));
    const offset = (page - 1) * limit;

    let conditions = [eq(households.villageId, villageId)];

    if (options.search) {
        conditions.push(
            or(
                like(households.headName, `%${options.search}%`),
                like(households.uid, `%${options.search}%`),
                like(households.houseNumber, `%${options.search}%`)
            )!
        );
    }

    if (options.ward && options.ward !== 'all') {
        conditions.push(eq(households.ward, options.ward));
    }

    if (options.status && options.status !== 'all') {
        conditions.push(eq(households.status, options.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
        .select({ count: count() })
        .from(households)
        .where(whereClause);

    const data = await db
        .select()
        .from(households)
        .where(whereClause)
        .orderBy(households.uid)
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

export async function getHouseholdByUid(uid: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.uid, uid));
    return household || undefined;
}

export async function updateHousehold(id: number, updates: Partial<Household>): Promise<Household> {
    const cache = getCache();
    const [household] = await db
        .update(households)
        .set({ ...updates })
        .where(eq(households.id, id))
        .returning();

    // Invalidate households cache
    await cache.delete(cacheKeys.households(household.villageId));
    await cache.clear(`households:${household.villageId}:*`);
    await cache.delete(cacheKeys.villageDetails(household.villageId));

    return household;
}

export async function deleteHousehold(id: number): Promise<void> {
    const cache = getCache();
    // Get villageId before deleting
    const [household] = await db.select({ villageId: households.villageId })
        .from(households)
        .where(eq(households.id, id))
        .limit(1);

    if (!household) return;

    // Delete related entities manually to ensure consistency
    await db.delete(wasteCollections).where(eq(wasteCollections.householdId, id));
    await db.delete(qrCodes).where(eq(qrCodes.householdId, id));
    await db.delete(feedback).where(eq(feedback.fromHouseholdId, id));
    await db.delete(households).where(eq(households.id, id));

    // Invalidate household caches
    if (household?.villageId) {
        await cache.delete(cacheKeys.households(household.villageId));
        await cache.clear(`households:${household.villageId}:*`);
        await cache.delete(cacheKeys.villageStats(household.villageId));
        await cache.delete(cacheKeys.villageDetails(household.villageId));
    }
}

export async function getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.generatorUserId, generatorUserId));
    return household || undefined;
}
