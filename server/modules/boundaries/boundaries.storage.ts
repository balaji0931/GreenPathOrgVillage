import { villageBoundaries, type VillageBoundary } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { getCache } from "../../cache";

export async function getVillageBoundaries(villageId: string): Promise<VillageBoundary[]> {
  const cache = getCache();
  const cacheKey = `village-boundaries:${villageId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached as VillageBoundary[];

  const boundaries = await db
    .select()
    .from(villageBoundaries)
    .where(eq(villageBoundaries.villageId, villageId))
    .orderBy(villageBoundaries.type, villageBoundaries.wardName);

  await cache.set(cacheKey, boundaries, 3600);
  return boundaries;
}

export async function upsertVillageBoundary(data: {
  villageId: string;
  type: 'village' | 'ward';
  wardName: string | null;
  coordinates: [number, number][];
  areaSqMeters: number;
}): Promise<VillageBoundary> {
  const cache = getCache();
  let result: VillageBoundary;

  if (data.type === 'village') {
    const existing = await db
      .select({ id: villageBoundaries.id })
      .from(villageBoundaries)
      .where(and(eq(villageBoundaries.villageId, data.villageId), eq(villageBoundaries.type, 'village')))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(villageBoundaries)
        .set({ coordinates: data.coordinates, areaSqMeters: data.areaSqMeters, updatedAt: new Date() })
        .where(eq(villageBoundaries.id, existing[0].id)).returning();
      result = updated;
    } else {
      try {
        const [created] = await db.insert(villageBoundaries)
          .values({ ...data, wardName: null }).returning();
        result = created;
      } catch (e: any) {
        // Race condition: another request inserted first. Retry as update.
        if (e?.code === '23505') {
          return upsertVillageBoundary(data);
        }
        throw e;
      }
    }
  } else {
    const existing = await db
      .select({ id: villageBoundaries.id })
      .from(villageBoundaries)
      .where(and(
        eq(villageBoundaries.villageId, data.villageId),
        eq(villageBoundaries.type, 'ward'),
        eq(villageBoundaries.wardName, data.wardName!)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(villageBoundaries)
        .set({ coordinates: data.coordinates, areaSqMeters: data.areaSqMeters, updatedAt: new Date() })
        .where(eq(villageBoundaries.id, existing[0].id)).returning();
      result = updated;
    } else {
      try {
        const [created] = await db.insert(villageBoundaries).values(data).returning();
        result = created;
      } catch (e: any) {
        if (e?.code === '23505') {
          return upsertVillageBoundary(data);
        }
        throw e;
      }
    }
  }

  await cache.delete(`village-boundaries:${data.villageId}`);
  return result;
}

export async function deleteVillageBoundary(id: number, villageId: string): Promise<boolean> {
  const cache = getCache();
  const result = await db.delete(villageBoundaries)
    .where(and(eq(villageBoundaries.id, id), eq(villageBoundaries.villageId, villageId)))
    .returning({ id: villageBoundaries.id });
  if (result.length > 0) { await cache.delete(`village-boundaries:${villageId}`); return true; }
  return false;
}
