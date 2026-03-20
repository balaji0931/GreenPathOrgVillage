import {
    villages,
    collectors,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

export async function addVehicleToVillage(villageId: string, vehicle: { registrationNumber: string; name: string; collectorIds: number[] }): Promise<void> {
    const [village] = await db.select({ villageId: villages.villageId, vehicles: villages.vehicles }).from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    const existingVehicles = (village.vehicles as any) || [];
    if (existingVehicles.find((v: any) => v.registrationNumber === vehicle.registrationNumber)) {
        throw new Error("Vehicle already exists");
    }

    // Ensure collectors are unassigned from other vehicles first
    if (vehicle.collectorIds && vehicle.collectorIds.length > 0) {
        for (const collectorId of vehicle.collectorIds) {
            await updateCollectorVehicle(collectorId, vehicle.registrationNumber);
        }
    }

    const updatedVehicles = [...existingVehicles, vehicle];
    await db.update(villages)
        .set({ vehicles: updatedVehicles })
        .where(eq(villages.villageId, villageId));

    // Clear cache
    const { getCache, cacheKeys } = await import('../../cache');
    await getCache().delete(cacheKeys.village(villageId));

}

export async function removeVehicleFromVillage(villageId: string, registrationNumber: string): Promise<void> {
    const [village] = await db.select({ villageId: villages.villageId, vehicles: villages.vehicles }).from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    const updatedVehicles = ((village.vehicles as any) || []).filter((v: any) => v.registrationNumber !== registrationNumber);

    await db.update(villages)
        .set({ vehicles: updatedVehicles })
        .where(eq(villages.villageId, villageId));

    // Clear assigned vehicle for collectors
    await db.update(collectors)
        .set({ assignedVehicle: null })
        .where(and(
            eq(collectors.villageId, villageId),
            eq(collectors.assignedVehicle, registrationNumber)
        ));

    // Clear cache
    const { getCache, cacheKeys } = await import('../../cache');
    await getCache().delete(cacheKeys.village(villageId));

}

export async function updateVehicleInVillage(villageId: string, registrationNumber: string, updates: { name: string; collectorIds: number[] }): Promise<void> {
    const [village] = await db.select({ villageId: villages.villageId, vehicles: villages.vehicles }).from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    let vehicles = (village.vehicles as any[]) || [];
    const vehicleIndex = vehicles.findIndex(v => v.registrationNumber === registrationNumber);
    if (vehicleIndex === -1) throw new Error("Vehicle not found");

    // Unassign collectors that were previously on this vehicle but aren't anymore
    const oldCollectorIds = vehicles[vehicleIndex].collectorIds || [];
    const removedCollectorIds = oldCollectorIds.filter((id: number) => !updates.collectorIds.includes(id));
    for (const id of removedCollectorIds) {
        await updateCollectorVehicle(id, null);
    }

    // Assign new collectors (this will handle removing them from other vehicles)
    for (const id of updates.collectorIds) {
        await updateCollectorVehicle(id, registrationNumber);
    }

    // Ensure collectors that were previously assigned to this vehicle but are not in the updates
    // are unassigned from this vehicle in the database
    const allVillageCollectors = await db.select({ id: collectors.id }).from(collectors).where(and(eq(collectors.villageId, villageId), eq(collectors.assignedVehicle, registrationNumber)));
    for (const c of allVillageCollectors) {
        if (!updates.collectorIds.includes(c.id)) {
            await updateCollectorVehicle(c.id, null);
        }
    }

    // Create a new array to ensure update is picked up
    const updatedVehicles = [...vehicles];
    updatedVehicles[vehicleIndex] = { ...updatedVehicles[vehicleIndex], ...updates };

    await db.update(villages).set({ vehicles: updatedVehicles }).where(eq(villages.villageId, villageId));

    // Clear cache
    const { getCache, cacheKeys } = await import('../../cache');
    await getCache().delete(cacheKeys.village(villageId));

}

export async function updateCollectorVehicle(collectorId: number, registrationNumber: string | null): Promise<void> {
    const [collector] = await db.select({ id: collectors.id, assignedVehicle: collectors.assignedVehicle, villageId: collectors.villageId }).from(collectors).where(eq(collectors.id, collectorId));
    if (!collector) throw new Error("Collector not found");

    // If assigned to a new vehicle, remove from old vehicle list in village json
    if (registrationNumber && collector.assignedVehicle && collector.assignedVehicle !== registrationNumber) {
        const [village] = await db.select({ villageId: villages.villageId, vehicles: villages.vehicles }).from(villages).where(eq(villages.villageId, collector.villageId as string));
        if (village) {
            const vehicles = (village.vehicles as any[]) || [];
            const oldVehicle = vehicles.find((v: any) => v.registrationNumber === collector.assignedVehicle);
            if (oldVehicle) {
                oldVehicle.collectorIds = (oldVehicle.collectorIds || []).filter((id: number) => id !== collectorId);
                await db.update(villages).set({ vehicles }).where(eq(villages.villageId, collector.villageId as string));
            }
        }
    }

    await db.update(collectors)
        .set({ assignedVehicle: registrationNumber })
        .where(eq(collectors.id, collectorId));
}
