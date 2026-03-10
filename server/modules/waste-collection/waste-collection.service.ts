import { storage } from "../../storage";
import { getCache, cacheKeys } from "../../cache";
import { updateDailyStatsAfterCollection } from "../analytics/daily-stats.storage";

/**
 * Submit a waste collection entry.
 * After inserting the collection, updates pre-calculated daily stats tables.
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

    // Update pre-calculated daily stats (transactional — 4 atomic UPSERTs)
    try {
        const village = await storage.getVillageByVillageId(household.villageId);
        const vehiclesList = (village?.vehicles as any[]) || [];
        const regNo = collector.assignedVehicle || "Unassigned";
        const vehicleEntry = vehiclesList.find((v: any) => v.registrationNumber === regNo);
        const vehicleName = vehicleEntry?.name || regNo;

        // Get collector names for this vehicle
        let collectorNames = collector.name;
        if (regNo !== "Unassigned") {
            const allCollectors = await storage.getCollectorsByVillage(household.villageId);
            const vehicleCollectors = allCollectors.filter((c: any) => c.assignedVehicle === regNo);
            collectorNames = vehicleCollectors.map((c: any) => c.name).join(", ") || collector.name;
        }

        // Get ward household count
        const allHouseholds = await storage.getHouseholdsByVillage(household.villageId);
        const wardHouseholds = allHouseholds.filter((h: any) => h.ward === household.ward);

        await updateDailyStatsAfterCollection({
            villageId: household.villageId,
            collectionDate,
            segregationRating,
            ward: household.ward || "Unknown",
            registrationNumber: regNo,
            vehicleName,
            collectorNames,
            currentTotalHouseholds: village?.totalHouseholds ?? allHouseholds.length,
            wardTotalHouseholds: wardHouseholds.length,
        });
    } catch (statsError) {
        // Stats update failure should not block the collection response.
        // Stats can be reconciled via backfill script if needed.
        console.error("[daily-stats] Failed to update daily stats after collection:", statsError);
    }

    // Invalidate relevant caches
    const cache = getCache();
    await cache.delete(cacheKeys.villageStats(household.villageId));

    return { conflict: false, collection };
}
