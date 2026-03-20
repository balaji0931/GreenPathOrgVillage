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
    const hashedPassword = await bcrypt.hash(insertModerator.moderatorId, Number(process.env.BCRYPT_ROUNDS) || 10);
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
    return await db.select({
        id: moderators.id,
        moderatorId: moderators.moderatorId,
        name: moderators.name,
        phone: moderators.phone,
        email: moderators.email,
        createdBy: moderators.createdBy,
        createdAt: moderators.createdAt,
        updatedAt: moderators.updatedAt,
    }).from(moderators);
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

export async function isModeratorAssignedToVillage(moderatorId: string, villageId: string): Promise<boolean> {
    const result = await db
        .select({ count: moderatorVillageAssignments.id })
        .from(moderatorVillageAssignments)
        .where(and(
            eq(moderatorVillageAssignments.moderatorId, moderatorId),
            eq(moderatorVillageAssignments.villageId, villageId)
        ))
        .limit(1);
    return result.length > 0;
}

export async function getManagersByVillage(villageId: string) {
    return await db.select({
        id: users.id,
        userId: users.userId,
        role: users.role,
        villageId: users.villageId,
        name: users.name,
        phone: users.phone,
        isFirstLogin: users.isFirstLogin,
        createdAt: users.createdAt,
    }).from(users)
        .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));
}
