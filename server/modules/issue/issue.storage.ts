import {
    issues,
    type Issue,
    type InsertIssue,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, count, and } from "drizzle-orm";
import { getCache, cacheKeys } from "../../cache";

export async function createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const cache = getCache();
    const issueData = {
        ...insertIssue,
        status: insertIssue.status || 'open',
        createdAt: new Date(),
    };

    const [issue] = await db
        .insert(issues)
        .values(issueData)
        .returning();

    // Invalidate issues cache
    if (insertIssue.villageId) {
        await cache.delete(cacheKeys.issues(insertIssue.villageId));
        await cache.clear(`issues:${insertIssue.villageId}:*`);
        await cache.delete(cacheKeys.villageDetails(insertIssue.villageId));
    }

    return issue;
}

export async function getIssuesByVillage(villageId: string): Promise<Issue[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.issues(villageId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db
        .select()
        .from(issues)
        .where(eq(issues.villageId, villageId))
        .orderBy(desc(issues.createdAt))
        .limit(500); // Safety limit - use paginated method for larger datasets

    await cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
}

export async function getIssuesByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
} = {}): Promise<{ data: Issue[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    let conditions = [eq(issues.villageId, villageId)];

    if (options.status && options.status !== 'all') {
        conditions.push(eq(issues.status, options.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
        .select({ count: count() })
        .from(issues)
        .where(whereClause);

    const data = await db
        .select()
        .from(issues)
        .where(whereClause)
        .orderBy(desc(issues.createdAt))
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

export async function updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    const cache = getCache();
    const [issue] = await db
        .update(issues)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(issues.id, id))
        .returning();

    // Invalidate issues cache
    if (issue?.villageId) {
        await cache.delete(cacheKeys.issues(issue.villageId));
        await cache.clear(`issues:${issue.villageId}:*`);
        await cache.delete(cacheKeys.villageStats(issue.villageId));
        await cache.delete(cacheKeys.villageDetails(issue.villageId));
    }

    return issue;
}

export async function getIssueById(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue || undefined;
}
