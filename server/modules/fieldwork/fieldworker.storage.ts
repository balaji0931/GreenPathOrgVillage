import {
    users,
    type User,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

// Field worker operations
export async function getFieldWorkersByVillage(villageId: string) {
    return await db
        .select({
            id: users.id,
            userId: users.userId,
            role: users.role,
            villageId: users.villageId,
            name: users.name,
            phone: users.phone,
            isFirstLogin: users.isFirstLogin,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(
            and(
                eq(users.villageId, villageId),
                eq(users.role, 'fieldworker')
            )
        )
        .orderBy(users.userId);
}

export async function deleteFieldWorker(userId: string): Promise<void> {
    await db.delete(users).where(
        and(
            eq(users.userId, userId),
            eq(users.role, 'fieldworker')
        )
    );
}
