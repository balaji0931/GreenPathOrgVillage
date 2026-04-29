import { auditLogs, type InsertAuditLog, type AuditLog } from "@shared/schema";
import { db } from "../../db";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";

/**
 * Log an important action to the audit trail.
 * This is fire-and-forget - failures are silently caught to never block the main operation.
 */
export async function logAction(
  villageId: string | null | undefined,
  userId: string,
  action: string,
  entity: string,
  entityId?: string | number | null,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      villageId: villageId || null,
      userId,
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      details: details || null,
    });
  } catch {
    // Audit logging must never break the main operation
  }
}

/**
 * Get paginated audit logs for a village (manager view) or all villages (admin view).
 */
export async function getAuditLogs(options: {
  villageId?: string;
  entity?: string;
  action?: string;
  userId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (options.villageId) {
    conditions.push(eq(auditLogs.villageId, options.villageId));
  }
  if (options.entity) {
    conditions.push(eq(auditLogs.entity, options.entity));
  }
  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }
  if (options.userId) {
    conditions.push(eq(auditLogs.userId, options.userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(whereClause);

  const data = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data,
    total: countResult.count,
    page,
    limit,
    totalPages: Math.ceil(countResult.count / limit),
  };
}

/**
 * Get paginated audit logs for multiple villages (moderator view).
 */
export async function getAuditLogsForVillages(options: {
  villageIds: string[];
  entity?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
  if (options.villageIds.length === 0) {
    return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const offset = (page - 1) * limit;

  const conditions = [inArray(auditLogs.villageId, options.villageIds)];

  if (options.entity) {
    conditions.push(eq(auditLogs.entity, options.entity));
  }
  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(whereClause);

  const data = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data,
    total: countResult.count,
    page,
    limit,
    totalPages: Math.ceil(countResult.count / limit),
  };
}
