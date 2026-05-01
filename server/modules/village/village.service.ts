import { storage } from "../../storage";
import bcrypt from "bcrypt";

/**
 * Generate a unique village ID by scanning existing villages.
 * Verbatim extraction from village.routes.ts POST /api/villages
 */
export async function generateVillageId(): Promise<string> {
    const villages = await storage.getVillages();

    // Extract just the numeric parts from all village IDs (e.g., 'V013' → 13)
    const maxIdNumber = villages.reduce((max, v) => {
        const num = parseInt(v.villageId?.slice(1) || "0");
        return num > max ? num : max;
    }, 0);

    // Assign the next unique ID
    const villageId = `V${String(maxIdNumber + 1).padStart(3, '0')}`;
    return villageId;
}

/**
 * Create a village with its first manager.
 * Verbatim extraction from village.routes.ts POST /api/villages
 */
export async function createVillageWithManager(data: {
    villageName: string;
    managerName: string;
    managerPhone: string;
    paymentsEnabled?: boolean;
    unitType?: string;
    maxHouseholds?: number;
}) {
    const { villageName, managerName, managerPhone, paymentsEnabled, unitType, maxHouseholds } = data;

    const villageId = await generateVillageId();

    // Create village
    const village = await storage.createVillage({
        villageId,
        name: villageName,
        paymentsEnabled: paymentsEnabled ?? false,
        unitType: unitType || 'gram_panchayat',
        maxHouseholds: maxHouseholds ?? 50,
    });

    // Create manager
    const managerId = `${villageId}-M1`;
    const hashedPassword = await bcrypt.hash(managerId, Number(process.env.BCRYPT_ROUNDS) || 10);

    const manager = await storage.createUser({
        userId: managerId,
        password: hashedPassword,
        role: 'manager',
        name: managerName,
        phone: managerPhone,
        villageId,
    });

    return {
        village,
        manager: {
            ...manager,
            credentials: {
                userId: managerId,
                password: managerId
            }
        }
    };
}

/**
 * Get all villages with their stats.
 * Verbatim extraction from village.routes.ts GET /api/villages
 */
export async function getVillagesWithStats() {
    const villages = await storage.getVillages();
    const villagesWithStats = await Promise.all(
        villages.slice(0, 50).map(async (village) => { // Limit to first 50 for performance
            const stats = await storage.getVillageStats(village.villageId);
            return { ...village, ...stats };
        })
    );
    return villagesWithStats;
}
