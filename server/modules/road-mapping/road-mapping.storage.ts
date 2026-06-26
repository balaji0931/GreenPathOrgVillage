import {
  villageRoads,
  type VillageRoad,
  type InsertVillageRoad,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { getCache } from "../../cache";

export async function getVillageRoads(villageId: string): Promise<VillageRoad[]> {
  const cache = getCache();
  const cacheKey = `village-roads:${villageId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const roads = await db
    .select()
    .from(villageRoads)
    .where(eq(villageRoads.villageId, villageId))
    .orderBy(villageRoads.createdAt);

  await cache.set(cacheKey, roads, 3600); // 1 hour TTL — roads rarely change
  return roads;
}

export async function createVillageRoad(data: InsertVillageRoad): Promise<VillageRoad> {
  const cache = getCache();

  const [road] = await db
    .insert(villageRoads)
    .values(data)
    .returning();

  await cache.delete(`village-roads:${data.villageId}`);
  return road;
}

export async function updateVillageRoad(
  id: number,
  villageId: string,
  updates: { name?: string; coordinates?: [number, number][]; distanceMeters?: number }
): Promise<VillageRoad | null> {
  const cache = getCache();

  const setData: Record<string, any> = {};
  if (updates.name !== undefined) setData.name = updates.name;
  if (updates.coordinates !== undefined) setData.coordinates = updates.coordinates;
  if (updates.distanceMeters !== undefined) setData.distanceMeters = updates.distanceMeters;

  if (Object.keys(setData).length === 0) return null;

  const [road] = await db
    .update(villageRoads)
    .set(setData)
    .where(and(eq(villageRoads.id, id), eq(villageRoads.villageId, villageId)))
    .returning();

  if (road) {
    await cache.delete(`village-roads:${villageId}`);
  }
  return road || null;
}

export async function deleteVillageRoad(id: number, villageId: string): Promise<boolean> {
  const cache = getCache();

  const result = await db
    .delete(villageRoads)
    .where(and(eq(villageRoads.id, id), eq(villageRoads.villageId, villageId)))
    .returning({ id: villageRoads.id });

  if (result.length > 0) {
    await cache.delete(`village-roads:${villageId}`);
    return true;
  }
  return false;
}
