import { storage } from "../../storage";
import bcrypt from "bcrypt";

/**
 * Generate a unique collector UID for a village.
 * Verbatim extraction from collector.routes.ts POST /api/collectors
 */
export async function generateCollectorUid(villageId: string): Promise<string> {
    const existingCollectors = await storage.getCollectorsByVillage(villageId);
    const uid = `${villageId}-C${existingCollectors.length + 1}`;
    return uid;
}

/**
 * Create a collector with user account.
 * Verbatim extraction from collector.routes.ts POST /api/collectors
 */
export async function createCollectorWithAccount(data: {
    name: string;
    phone: string;
    villageId: string;
}) {
    const { name, phone, villageId } = data;

    // Generate UID
    const uid = await generateCollectorUid(villageId);

    // Create collector
    const collector = await storage.createCollector({
        uid,
        villageId,
        name,
        phone,
    });

    // Create user account for collector
    const hashedPassword = await bcrypt.hash(uid, Number(process.env.BCRYPT_ROUNDS) || 10);
    await storage.createUser({
        userId: uid,
        password: hashedPassword,
        role: 'collector',
        name,
        phone,
        villageId,
    });

    return collector;
}

/**
 * Get collector stats for a village.
 * Verbatim extraction from collector.routes.ts GET /api/collectors/stats/:villageId
 */
export async function getCollectorStatsForVillage(villageId: string) {
    const collectors = await storage.getCollectorsByVillage(villageId);

    const collectorStats = await Promise.all(
        collectors.map(async (collector) => {
            const stats = await storage.getCollectorStats(collector.id);
            return {
                id: collector.id,
                name: collector.name,
                ...stats,
            };
        })
    );

    return collectorStats;
}
