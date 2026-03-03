import { storage } from "../../storage";
import { getCache, cacheKeys } from "../../cache";

/**
 * Submit a waste collection entry.
 * Verbatim extraction from waste-collection.routes.ts POST /api/waste-collections
 */
export async function submitCollection(data: {
    householdUid: string;
    collectorUserId: string;
    segregationRating: number;
    plasticRating: number;
    observations: any;
    remarks: string;
    photoUrl: string;
    voiceUrl: string;
    status: string;
    missedReason: string;
    collectionDate?: string;
}) {
    const {
        householdUid,
        collectorUserId,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate: clientCollectionDate
    } = data;

    const household = await storage.getHouseholdByUid(householdUid);
    if (!household) {
        throw new Error("Household not found");
    }

    const collector = await storage.getCollectorByUid(collectorUserId);
    if (!collector) {
        throw new Error("Collector not found");
    }

    // Security: verify collector and household belong to the same village
    if (household.villageId !== collector.villageId) {
        throw new Error("VILLAGE_MISMATCH");
    }

    // Check for existing collection today
    const collectionDate = clientCollectionDate ? new Date(clientCollectionDate) : new Date();
    // Use local date string (YYYY-MM-DD) instead of toISOString() to avoid UTC mismatch near midnight
    const dateStr = `${collectionDate.getFullYear()}-${String(collectionDate.getMonth() + 1).padStart(2, '0')}-${String(collectionDate.getDate()).padStart(2, '0')}`;
    const existingCollection = await storage.checkExistingCollection(household.id, collector.id, dateStr);

    if (existingCollection) {
        return {
            conflict: true,
            message: "Collection already recorded for this household today",
            existingCollection
        };
    }

    const collection = await storage.createWasteCollection({
        householdId: household.id,
        collectorId: collector.id,
        collectionDate,
        segregationRating,
        plasticRating,
        observations,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
    });

    // Phase 4: Invalidate relevant caches
    const cache = getCache();
    await cache.delete(cacheKeys.villageStats(household.villageId));
    await cache.delete(cacheKeys.dailyReport(household.villageId, new Date().toISOString().split('T')[0]));
    await cache.clear('report:*'); // Clear all report caches

    return { conflict: false, collection };
}
