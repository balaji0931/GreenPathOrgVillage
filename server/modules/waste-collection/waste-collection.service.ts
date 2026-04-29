import { storage } from "../../storage";
import { getCache, cacheKeys } from "../../cache";
import { updateDailyStatsAfterCollection } from "../analytics/daily-stats.storage";
import { updateHouseholdBehaviourStats } from "../behaviour/behaviour.storage";
import { triggerProximityAlert } from "../push/push.service";

/**
 * Submit a waste collection entry.
 * After inserting the collection, updates pre-calculated daily stats tables.
 */
export async function submitCollection(data: {
    householdUid: string;
    collectorUserId: string;
    segregationRating: number;
    remarks: string;
    photoUrl: string;
    voiceUrl: string;
    status: string;
    missedReason: string;
    collectionDate?: string;
    wasteTypes?: string[];
    weightKg?: string | null;
    latitude?: string | null;
    longitude?: string | null;
}) {
    const {
        householdUid,
        collectorUserId,
        segregationRating,
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        collectionDate: clientCollectionDate,
        wasteTypes,
        weightKg,
        latitude,
        longitude,
    } = data;

    const household = await storage.getHouseholdByUid(householdUid);
    if (!household || household.status === 'deleted') {
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
        remarks,
        photoUrl,
        voiceUrl,
        status,
        missedReason,
        wasteTypes: wasteTypes || [],
        weightKg: weightKg || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
    });

    // ─── Response is ready: return immediately ───
    // All post-insert side effects run fire-and-forget so the collector
    // is never blocked and rapid submissions don't exhaust the DB pool.
    const villageId = household.villageId;
    const ward = household.ward || "Unknown";
    const householdId = household.id;

    // Fire-and-forget: stats, cache, push
    (async () => {
      try {
        // Update pre-calculated daily stats
        const village = await storage.getVillageByVillageId(villageId);
        const vehiclesList = (village?.vehicles as any[]) || [];
        const regNo = collector.assignedVehicle || "Unassigned";
        const vehicleEntry = vehiclesList.find((v: any) => v.registrationNumber === regNo);
        const vehicleName = vehicleEntry?.name || regNo;

        // Get collector names for this vehicle
        let collectorNames = collector.name;
        if (regNo !== "Unassigned") {
            const allCollectors = await storage.getCollectorsByVillage(villageId);
            const vehicleCollectors = allCollectors.filter((c: any) => c.assignedVehicle === regNo);
            collectorNames = vehicleCollectors.map((c: any) => c.name).join(", ") || collector.name;
        }

        // Targeted ward household count (instead of fetching ALL households)
        const allHouseholds = await storage.getHouseholdsByVillage(villageId);
        const wardHouseholds = allHouseholds.filter((h: any) => h.ward === ward);

        await updateDailyStatsAfterCollection({
            villageId,
            collectionDate,
            segregationRating,
            ward,
            registrationNumber: regNo,
            vehicleName,
            collectorNames,
            currentTotalHouseholds: village?.totalHouseholds ?? allHouseholds.length,
            wardTotalHouseholds: wardHouseholds.length,
        });
      } catch (statsError) {
        // Stats update failure is non-critical; nightly reconciliation will fix
      }

      // Update household behaviour stats
      try {
        await updateHouseholdBehaviourStats(
            householdId,
            villageId,
            ward,
            wasteTypes || []
        );
      } catch (_behaviourError) {
        // Non-blocking - nightly refresh will catch up
      }

      // Invalidate caches
      try {
        const cache = getCache();
        await cache.delete(cacheKeys.villageStats(villageId));
      } catch (_) {}

      // Trigger proximity push alerts
      const alertLat = parseFloat(latitude || '') || parseFloat(String(household.latitude || ''));
      const alertLng = parseFloat(longitude || '') || parseFloat(String(household.longitude || ''));
      if (alertLat && alertLng && status === 'collected') {
        triggerProximityAlert({
          collectorId: collectorUserId,
          villageId,
          householdId,
          lat: alertLat,
          lng: alertLng,
          todayDateStr: dateStr,
        }).catch(() => {});
      }
    })().catch((err) => {
      console.error('[submitCollection] Background task error:', err);
    });

    return { conflict: false, collection };
}
