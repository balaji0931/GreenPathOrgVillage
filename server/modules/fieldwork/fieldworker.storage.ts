import {
    users,
    type User,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

// Field worker operations
export async function getFieldWorkersByVillage(villageId: string): Promise<User[]> {
    return await db
        .select()
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
