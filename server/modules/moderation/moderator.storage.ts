import bcrypt from "bcrypt";
import {
    villages,
    users,
    moderators,
    moderatorVillageAssignments,
    type Moderator,
    type InsertModerator,
    type ModeratorVillageAssignment,
    type InsertModeratorVillageAssignment,
    type User,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

// =====================================================
// MODERATOR CRUD OPERATIONS
// =====================================================

export async function createModerator(insertModerator: InsertModerator): Promise<Moderator> {
    const [moderator] = await db
        .insert(moderators)
        .values(insertModerator)
        .returning();

    // Create user account for moderator
    const hashedPassword = await bcrypt.hash(insertModerator.moderatorId, 10);
    await db
        .insert(users)
        .values({
            userId: insertModerator.moderatorId,
            password: hashedPassword,
            role: 'moderator',
            name: insertModerator.name,
            phone: insertModerator.phone,
            villageId: null,
        });

    return moderator;
}

export async function getModeratorsList(): Promise<Moderator[]> {
    return await db.select().from(moderators);
}

export async function updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator> {
    const [moderator] = await db
        .update(moderators)
        .set(updates)
        .where(eq(moderators.moderatorId, moderatorId))
        .returning();
    return moderator;
}

export async function deleteModerator(moderatorId: string): Promise<void> {
    // Delete moderator village assignments first
    await db.delete(moderatorVillageAssignments).where(eq(moderatorVillageAssignments.moderatorId, moderatorId));

    // Delete user account
    await db.delete(users).where(eq(users.userId, moderatorId));

    // Delete moderator
    await db.delete(moderators).where(eq(moderators.moderatorId, moderatorId));
}

export async function assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment> {
    const [villageAssignment] = await db
        .insert(moderatorVillageAssignments)
        .values(assignment)
        .returning();
    return villageAssignment;
}

export async function removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void> {
    await db.delete(moderatorVillageAssignments).where(
        and(
            eq(moderatorVillageAssignments.moderatorId, moderatorId),
            eq(moderatorVillageAssignments.villageId, villageId)
        )
    );
}

export async function getModeratorVillages(moderatorId: string): Promise<any[]> {
    return await db
        .select({
            villageId: villages.villageId,
            name: villages.name,
            assignedAt: moderatorVillageAssignments.assignedAt,
        })
        .from(moderatorVillageAssignments)
        .innerJoin(villages, eq(moderatorVillageAssignments.villageId, villages.villageId))
        .where(eq(moderatorVillageAssignments.moderatorId, moderatorId));
}

export async function getManagersByVillage(villageId: string): Promise<User[]> {
    return await db.select().from(users)
        .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));
}
