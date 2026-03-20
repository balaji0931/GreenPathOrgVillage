import { storage } from "../../storage";
import bcrypt from "bcrypt";

/**
 * Generate a unique moderator ID by scanning existing and finding next available.
 * Verbatim extraction from admin-users.routes.ts POST /api/moderators
 */
export async function generateModeratorId(): Promise<string> {
    const existingModerators = await storage.getModeratorsList();

    // Extract existing numbers from IDs like "MOD-001"
    const usedNumbers = existingModerators
        .map((mod) => {
            const match = mod.moderatorId.match(/MOD-(\d+)/);
            return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

    // Find the first available number
    let moderatorNumber = 1;
    for (const n of usedNumbers) {
        if (n === moderatorNumber) {
            moderatorNumber++;
        } else {
            break;
        }
    }

    const moderatorId = `MOD-${String(moderatorNumber).padStart(3, '0')}`;
    return moderatorId;
}

/**
 * Create a moderator with user account and assign villages.
 * Verbatim extraction from admin-users.routes.ts POST /api/moderators
 */
export async function createModerator(data: {
    name: string;
    phone: string;
    email: string;
    villageIds: string[];
    createdBy: string;
}) {
    const { name, phone, email, villageIds = [], createdBy } = data;

    const moderatorId = await generateModeratorId();

    // Create moderator
    const moderator = await storage.createModerator({
        moderatorId,
        name,
        phone,
        email,
        createdBy,
    });

    // Assign villages if provided
    for (const villageId of villageIds) {
        await storage.assignVillageToModerator({
            moderatorId,
            villageId,
            assignedBy: createdBy,
        });
    }

    return {
        moderator,
        credentials: {
            userId: moderatorId,
        },
    };
}

/**
 * Get all moderators with their village assignments.
 * Verbatim extraction from admin-users.routes.ts GET /api/moderators
 */
export async function getModeratorsWithVillages() {
    const moderators = await storage.getModeratorsList();

    // Get village assignments for each moderator (limited to first 50 for performance)
    const moderatorsWithVillages = await Promise.all(
        moderators.slice(0, 50).map(async (moderator) => {
            const villages = await storage.getModeratorVillages(moderator.moderatorId);
            return { ...moderator, villages };
        })
    );

    return moderatorsWithVillages;
}

/**
 * Reset a user's password to their user ID.
 * Verbatim extraction from admin-users.routes.ts PUT /api/managers/:managerId/reset-password
 */
export async function resetPasswordToUserId(userId: string) {
    const newPassword = userId; // Reset to user ID
    const hashedPassword = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS) || 10);
    await storage.updateUserPassword(userId, hashedPassword);
}

/**
 * Add a manager to a village.
 * Verbatim extraction from admin-users.routes.ts POST /api/villages/:villageId/managers
 */
export async function addManagerToVillage(villageId: string, data: {
    managerName: string;
    managerPhone: string;
}) {
    const { managerName, managerPhone } = data;

    const manager = await storage.addManagerToVillage({
        villageId,
        managerName,
        managerPhone,
    });

    return {
        manager: {
            ...manager,
            credentials: {
                userId: manager.userId,
            }
        }
    };
}
