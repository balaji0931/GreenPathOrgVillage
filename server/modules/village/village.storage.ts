import {
    villages,
    users,
    households,
    collectors,
    wasteCollections,
    issues,
    announcements,
    feedback,
    moderatorVillageAssignments,
    type Village,
    type InsertVillage,
} from "@shared/schema";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function createVillage(insertVillage: InsertVillage): Promise<Village> {
    const cache = getCache();
    const [village] = await db
        .insert(villages)
        .values(insertVillage as any)
        .returning();

    // Invalidate village caches
    await cache.delete(cacheKeys.villages());
    await cache.clear('villages:paginated:*'); // Clear all paginated caches

    return village;
}

export async function getVillages(): Promise<Village[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.villages());
    if (cached) return cached;

    const result = await db.select().from(villages).orderBy(villages.villageId).limit(500); // Safety limit
    await cache.set(cacheKeys.villages(), result, 3600); // 1 hour TTL
    return result;
}

export async function getVillageByVillageId(villageId: string): Promise<Village | undefined> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.village(villageId));
    if (cached) return cached;

    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    if (village) {
        await cache.set(cacheKeys.village(villageId), village, 3600);
    }
    return village || undefined;
}

export async function updateVillage(villageId: string, updates: Partial<Village>): Promise<Village> {
    const cache = getCache();
    const [village] = await db
        .update(villages)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(villages.villageId, villageId))
        .returning();

    // Invalidate all village caches including paginated
    await cache.delete(cacheKeys.village(villageId));
    await cache.delete(cacheKeys.villages());

    await cache.clear('villages:paginated:*'); // Clear all paginated village caches

    return village;
}

export async function getWardsByVillage(villageId: string): Promise<string[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.wards(villageId));
    if (cached) return cached;

    const [village] = await db
        .select({ wards: villages.wards })
        .from(villages)
        .where(eq(villages.villageId, villageId));

    const wards = (village?.wards || [])
        .filter((ward: string | null) => ward && ward.trim() !== '')
        .sort();

    await cache.set(cacheKeys.wards(villageId), wards, 3600);
    return wards;
}

export async function addWardToVillage(villageId: string, ward: string): Promise<string[]> {
    const cache = getCache();

    const [village] = await db
        .select({ wards: villages.wards })
        .from(villages)
        .where(eq(villages.villageId, villageId));

    const existingWards = village?.wards || [];
    if (existingWards.includes(ward)) {
        throw new Error("Ward already exists");
    }

    const updatedWards = [...existingWards, ward].sort();

    await db
        .update(villages)
        .set({ wards: updatedWards, updatedAt: new Date() })
        .where(eq(villages.villageId, villageId));

    await cache.delete(cacheKeys.wards(villageId));
    await cache.delete(cacheKeys.village(villageId));

    return updatedWards;
}

export async function deleteVillage(villageId: string): Promise<void> {
    // Delete in proper order to avoid foreign key violations

    // 1. Delete waste collections for this village's households
    await db.delete(wasteCollections)
        .where(sql`household_id IN (SELECT id FROM households WHERE village_id = ${villageId})`);

    // 2. Delete feedback and for this village's collectors
    await db.delete(feedback)
        .where(sql`to_collector_id IN (SELECT id FROM collectors WHERE village_id = ${villageId})`);

    await db.delete(moderatorVillageAssignments)
        .where(sql`village_id = ${villageId}`);


    // 3. Delete main tables
    await db.delete(households).where(eq(households.villageId, villageId));
    await db.delete(collectors).where(eq(collectors.villageId, villageId));
    await db.delete(issues).where(eq(issues.villageId, villageId));
    await db.delete(announcements).where(eq(announcements.villageId, villageId));
    await db.delete(users).where(eq(users.villageId, villageId));
    await db.delete(villages).where(eq(villages.villageId, villageId));
}
