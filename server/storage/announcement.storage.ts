import {
    announcements,
    type Announcement,
    type InsertAnnouncement,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, count, isNull } from "drizzle-orm";
import { getCache, cacheKeys } from "../cache";

export async function createAnnouncement(data: {
    message: string;
    targetAudience: string;
    villageId?: string | null;
    createdBy: string;
    photoUrl?: string | null;
}) {
    const cache = getCache();
    const [announcement] = await db
        .insert(announcements)
        .values(data)
        .returning();

    // Invalidate cache
    if (data.villageId) {
        await cache.delete(cacheKeys.announcements(data.villageId));
    } else {
        await cache.delete(cacheKeys.globalAnnouncements());
    }

    return announcement;
}

export async function getAnnouncementsByVillage(villageId: string): Promise<Announcement[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.announcements(villageId));
    if (cached) return cached;

    const result = await db
        .select()
        .from(announcements)
        .where(eq(announcements.villageId, villageId))
        .orderBy(desc(announcements.createdAt));

    await cache.set(cacheKeys.announcements(villageId), result, 1800);
    return result;
}

export async function getGlobalAnnouncements(): Promise<Announcement[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.globalAnnouncements());
    if (cached) return cached;

    const result = await db
        .select()
        .from(announcements)
        .where(isNull(announcements.villageId))
        .orderBy(desc(announcements.createdAt));

    await cache.set(cacheKeys.globalAnnouncements(), result, 1800);
    return result;
}

export async function getAllAnnouncements() {
    return await db.select({
        id: announcements.id,
        message: announcements.message,
        targetAudience: announcements.targetAudience,
        villageId: announcements.villageId,
        photoUrl: announcements.photoUrl,
        createdAt: announcements.createdAt,
        createdBy: announcements.createdBy,
    })
        .from(announcements)
        .orderBy(desc(announcements.createdAt))
        .limit(200); // Safety limit
}

export async function getAllAnnouncementsPaginated(options: {
    page?: number;
    limit?: number;
    villageId?: string;
} = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.announcementsPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.villageId) return cached;

    let whereClause = undefined;
    if (options.villageId) {
        whereClause = eq(announcements.villageId, options.villageId);
    }

    const [countResult] = await db
        .select({ count: count() })
        .from(announcements)
        .where(whereClause);

    const data = await db.select({
        id: announcements.id,
        message: announcements.message,
        targetAudience: announcements.targetAudience,
        villageId: announcements.villageId,
        photoUrl: announcements.photoUrl,
        createdAt: announcements.createdAt,
        createdBy: announcements.createdBy,
    })
        .from(announcements)
        .where(whereClause)
        .orderBy(desc(announcements.createdAt))
        .limit(limit)
        .offset(offset);

    const result = {
        data,
        total: countResult.count,
        page,
        limit,
        totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.villageId) {
        await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
}

export async function updateAnnouncement(id: string, data: {
    message: string;
    targetAudience: string;
    photoUrl?: string | null;
    updatedBy: string;
}) {
    const [updated] = await db.update(announcements)
        .set({
            message: data.message,
            targetAudience: data.targetAudience,
            photoUrl: data.photoUrl,
        })
        .where(eq(announcements.id, parseInt(id)))
        .returning();

    return updated;
}

export async function deleteAnnouncement(id: string, deletedBy: string) {
    const [deleted] = await db.delete(announcements)
        .where(eq(announcements.id, parseInt(id)))
        .returning();

    return deleted;
}
