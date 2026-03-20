import {
    households,
    wasteCollections,
    qrCodes,
    feedback,
    householdMonthlyBills,
    paymentAuditLog,
    householdBehaviourStats,
    type Household,
    type InsertHousehold,
} from "@shared/schema";
import { eq, count, and, or, like, sql, ne } from "drizzle-orm";
import { db } from "../../db";
import { getCache, cacheKeys } from "../../cache";
import { incrementHouseholdCount, decrementHouseholdCount } from "../analytics/daily-stats.storage";

// Columns safe to return from household queries — generatorPassword NEVER leaves the DB
const safeHouseholdColumns = {
    id: households.id,
    uid: households.uid,
    villageId: households.villageId,
    headName: households.headName,
    phone: households.phone,
    houseNumber: households.houseNumber,
    ward: households.ward,
    familySize: households.familySize,
    address: households.address,
    status: households.status,
    householdType: households.householdType,
    qrPrinted: households.qrPrinted,
    generatorUserId: households.generatorUserId,
    latitude: households.latitude,
    longitude: households.longitude,
    createdAt: households.createdAt,
};

export async function createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const cache = getCache();
    const [household] = await db
        .insert(households)
        .values(insertHousehold)
        .returning();

    // Invalidate households cache
    await cache.delete(cacheKeys.households(insertHousehold.villageId));
    await cache.clear(`households:${insertHousehold.villageId}:*`);
    await cache.delete(cacheKeys.villageStats(insertHousehold.villageId));

    // Update pre-calculated daily stats
    try {
        await incrementHouseholdCount(insertHousehold.villageId, insertHousehold.ward || "Unknown");
    } catch (err) {
    }

    return household;
}

export async function getHouseholdsByVillage(villageId: string) {
    const cache = getCache();
    const cacheKey = cacheKeys.households(villageId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db
        .select(safeHouseholdColumns)
        .from(households)
        .where(
            and(
                eq(households.villageId, villageId),
                ne(households.status, 'deleted')
            )
        )
        .orderBy(households.uid)
        .limit(2000); // Safety limit - use paginated method for larger datasets

    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
}

export async function getHouseholdsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    ward?: string;
    status?: string;
} = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(500, Math.max(1, options.limit || 100));
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
    } else {
        conditions.push(ne(households.status, 'deleted'));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
        .select({ count: count() })
        .from(households)
        .where(whereClause);

    const data = await db
        .select(safeHouseholdColumns)
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

export async function getHouseholdByUid(uid: string) {
    const [household] = await db.select(safeHouseholdColumns).from(households).where(eq(households.uid, uid));
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


    return household;
}

export async function deleteHousehold(id: number): Promise<void> {
    const cache = getCache();
    
    // Get household details before deleting (need villageId, ward, and generatorUserId)
    const [household] = await db.select({ 
        villageId: households.villageId, 
        ward: households.ward,
        generatorUserId: households.generatorUserId
    })
    .from(households)
    .where(eq(households.id, id))
    .limit(1);

    if (!household) return;

    // Execute a Soft-Delete:
    // We strictly preserve householdMonthlyBills, householdBehaviourStats, paymentAuditLog, return feedback and wasteCollections
    
    // 1. Delete user authentication (Login capability)
    if (household.generatorUserId) {
        // Need to import users. Doing raw query to easily target users table since it's not imported.
        await db.execute(sql`DELETE FROM users WHERE user_id = ${household.generatorUserId}`);
    }

    // 2. Delete QR codes as they represent physical access points that are invalid
    await db.delete(qrCodes).where(eq(qrCodes.householdId, id));

    // 3. Update the household status to 'deleted'
    await db.update(households)
        .set({ status: 'deleted' })
        .where(eq(households.id, id));

    // Update pre-calculated daily stats
    if (household?.villageId) {
        try {
            await decrementHouseholdCount(household.villageId, household.ward || "Unknown");
        } catch (err) {
        }
    }

    // Invalidate household caches
    if (household?.villageId) {
        await cache.delete(cacheKeys.households(household.villageId));
        await cache.clear(`households:${household.villageId}:*`);
        await cache.delete(cacheKeys.villageStats(household.villageId));
    }
}

export async function getHouseholdByGeneratorUserId(generatorUserId: string) {
    const [household] = await db.select(safeHouseholdColumns).from(households).where(eq(households.generatorUserId, generatorUserId));
    return household || undefined;
}

