import bcrypt from "bcrypt";
import {
    users,
    type User,
    type InsertUser,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

export async function getUserByUserId(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    return user || undefined;
}

export async function createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
    return user;
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
    await db
        .update(users)
        .set({ password, isFirstLogin: false })
        .where(eq(users.userId, userId));
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.userId, userId))
        .returning();
    return user;
}

export async function addManagerToVillage(villageData: {
    villageId: string;
    managerName: string;
    managerPhone: string;
}): Promise<User> {
    const { villageId, managerName, managerPhone } = villageData;

    // Get all existing managers for the village
    const existingManagers = await db
        .select({ userId: users.userId })
        .from(users)
        .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));

    // Extract and parse manager numbers from user IDs like "V001-M3"
    const usedNumbers = existingManagers
        .map((u) => {
            const match = u.userId.match(/-M(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .sort((a, b) => a - b);

    // Find the smallest unused manager number
    let managerNumber = 1;
    for (const num of usedNumbers) {
        if (num === managerNumber) {
            managerNumber++;
        } else {
            break;
        }
    }

    const managerId = `${villageId}-M${managerNumber}`;
    const hashedPassword = await bcrypt.hash(managerId, Number(process.env.BCRYPT_ROUNDS) || 10);

    // Insert new manager
    const [manager] = await db
        .insert(users)
        .values({
            userId: managerId,
            password: hashedPassword,
            role: 'manager',
            name: managerName,
            phone: managerPhone,
            villageId,
        })
        .returning();

    return manager;
}

export async function deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.userId, userId));
}
