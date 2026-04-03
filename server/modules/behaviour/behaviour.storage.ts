import { db } from "../../db";
import {
  householdBehaviourStats,
  wasteCollections,
  households,
  systemJobs,
  villages,
} from "@shared/schema";
import { eq, and, sql, gt, desc, inArray } from "drizzle-orm";

// ═══════════════════════════════════════════
// IST Helper
// ═══════════════════════════════════════════
function getTodayIST(): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset).toISOString().split("T")[0];
}

// Default thresholds when village has none configured
export const DEFAULT_THRESHOLDS = {
  minAvgRating: 3,
  maxMixed7Days: 3,
  maxInactiveDays: 21,
  minCollections7Days: 0,
  minCollections30Days: 0,
};

// ═══════════════════════════════════════════
// Per-Household Upsert (called after each collection, ~15ms)
// ═══════════════════════════════════════════

export async function updateHouseholdBehaviourStats(
  householdId: number,
  villageId: string,
  ward: string,
  wasteTypes: string[]
): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Count collections last 7 days
  const [coll7] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(wasteCollections)
    .where(
      and(
        eq(wasteCollections.householdId, householdId),
        gt(wasteCollections.collectionDate, sevenDaysAgo),
        eq(wasteCollections.status, "collected")
      )
    );

  // 2. Count collections last 30 days
  const [coll30] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(wasteCollections)
    .where(
      and(
        eq(wasteCollections.householdId, householdId),
        gt(wasteCollections.collectionDate, thirtyDaysAgo),
        eq(wasteCollections.status, "collected")
      )
    );

  // 3. Count mixed waste last 7 days
  const [mixed7] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(wasteCollections)
    .where(
      and(
        eq(wasteCollections.householdId, householdId),
        gt(wasteCollections.collectionDate, sevenDaysAgo),
        sql`${wasteCollections.wasteTypes}::text LIKE '%mixed%'`
      )
    );

  // 4. Avg rating of last 10 collections with rating
  const [avgRating] = await db
    .select({ avg: sql<string>`AVG(sub.segregation_rating)::numeric(3,1)` })
    .from(
      sql`(
        SELECT ${wasteCollections.segregationRating} as segregation_rating
        FROM ${wasteCollections}
        WHERE ${wasteCollections.householdId} = ${householdId}
          AND ${wasteCollections.segregationRating} IS NOT NULL
        ORDER BY ${wasteCollections.collectionDate} DESC
        LIMIT 10
      ) sub`
    );

  // 5. Total collections
  const [total] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(wasteCollections)
    .where(
      and(
        eq(wasteCollections.householdId, householdId),
        eq(wasteCollections.status, "collected")
      )
    );

  // 6. Determine last collection type
  const lastCollectionType = wasteTypes.includes("mixed") ? "mixed" : "segregated";

  // 7. Upsert
  await db
    .insert(householdBehaviourStats)
    .values({
      villageId,
      householdId,
      ward,
      totalCollections: total.count,
      collectionsLast7: coll7.count,
      collectionsLast30: coll30.count,
      avgRatingLast10: avgRating.avg || null,
      mixedCountLast7: mixed7.count,
      lastCollectionDate: now,
      daysSinceLastCollection: 0,
      lastCollectionType,
    })
    .onConflictDoUpdate({
      target: [householdBehaviourStats.householdId],
      set: {
        ward,
        totalCollections: total.count,
        collectionsLast7: coll7.count,
        collectionsLast30: coll30.count,
        avgRatingLast10: avgRating.avg || null,
        mixedCountLast7: mixed7.count,
        lastCollectionDate: now,
        daysSinceLastCollection: 0,
        lastCollectionType,
        updatedAt: sql`NOW()`,
      },
    });
}

// ═══════════════════════════════════════════
// Nightly Batch Refresh (all villages, batch SQL)
// ═══════════════════════════════════════════

export async function refreshAllBehaviourStats(): Promise<void> {
  console.log("[BehaviourStats] Starting nightly refresh...");
  const startTime = Date.now();

  // Step 0: Ensure ALL active households have a stats row (inserts missing ones)
  await db.execute(sql`
    INSERT INTO household_behaviour_stats (village_id, household_id, ward)
    SELECT h.village_id, h.id, h.ward
    FROM households h
    WHERE h.status = 'active'
      AND h.id NOT IN (
        SELECT household_id FROM household_behaviour_stats
      )
  `);

  // Step 1: Update collections_last_7 for households WITH recent collections
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET collections_last_7 = sub.cnt
    FROM (
      SELECT household_id, COUNT(*) as cnt
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '7 days'
        AND status = 'collected'
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  // Zero out households NOT IN recent collections
  await db.execute(sql`
    UPDATE household_behaviour_stats
    SET collections_last_7 = 0
    WHERE household_id NOT IN (
      SELECT DISTINCT household_id
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '7 days'
        AND status = 'collected'
    )
    AND collections_last_7 > 0
  `);

  // Step 2: Update collections_last_30
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET collections_last_30 = sub.cnt
    FROM (
      SELECT household_id, COUNT(*) as cnt
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '30 days'
        AND status = 'collected'
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  await db.execute(sql`
    UPDATE household_behaviour_stats
    SET collections_last_30 = 0
    WHERE household_id NOT IN (
      SELECT DISTINCT household_id
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '30 days'
        AND status = 'collected'
    )
    AND collections_last_30 > 0
  `);

  // Step 3: Update mixed_count_last_7
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET mixed_count_last_7 = COALESCE(sub.cnt, 0)
    FROM (
      SELECT household_id, COUNT(*) as cnt
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '7 days'
        AND waste_types::text LIKE '%mixed%'
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  await db.execute(sql`
    UPDATE household_behaviour_stats
    SET mixed_count_last_7 = 0
    WHERE household_id NOT IN (
      SELECT DISTINCT household_id
      FROM waste_collections
      WHERE collection_date > NOW() - INTERVAL '7 days'
        AND waste_types::text LIKE '%mixed%'
    )
    AND mixed_count_last_7 > 0
  `);

  // Step 4: Update days_since_last_collection
  await db.execute(sql`
    UPDATE household_behaviour_stats
    SET days_since_last_collection =
      EXTRACT(DAY FROM NOW() - last_collection_date)::integer
    WHERE last_collection_date IS NOT NULL
  `);

  // Step 5: Sync ward from households table (handles ward changes)
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET ward = h.ward
    FROM households h
    WHERE h.id = hbs.household_id
      AND h.ward != hbs.ward
  `);

  // Step 6: Update total_collections
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET total_collections = sub.cnt
    FROM (
      SELECT household_id, COUNT(*) as cnt
      FROM waste_collections
      WHERE status = 'collected'
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  // Step 7: Update last_collection_date for all households
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET last_collection_date = sub.last_date
    FROM (
      SELECT household_id, MAX(collection_date) as last_date
      FROM waste_collections
      WHERE status = 'collected'
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  // Step 8: Update avg_rating_last_10 (avg of last 10 rated collections per household)
  await db.execute(sql`
    UPDATE household_behaviour_stats hbs
    SET avg_rating_last_10 = sub.avg_rating::numeric(3,1)
    FROM (
      SELECT household_id, AVG(segregation_rating) as avg_rating
      FROM (
        SELECT household_id, segregation_rating,
               ROW_NUMBER() OVER (PARTITION BY household_id ORDER BY collection_date DESC) as rn
        FROM waste_collections
        WHERE segregation_rating IS NOT NULL
      ) ranked
      WHERE rn <= 10
      GROUP BY household_id
    ) sub
    WHERE hbs.household_id = sub.household_id
  `);

  const elapsed = Date.now() - startTime;
  console.log(`[BehaviourStats] Nightly refresh completed in ${elapsed}ms`);
}

// ═══════════════════════════════════════════
// Job Guard (system_jobs table)
// ═══════════════════════════════════════════

export async function checkAndRunDailyRefresh(): Promise<void> {
  const todayIST = getTodayIST();

  // Get or create job record
  const [job] = await db
    .select()
    .from(systemJobs)
    .where(eq(systemJobs.jobName, "behaviour_stats_refresh"));

  if (job && job.lastRunDate === todayIST) {
    // Already ran today
    return;
  }

  // Run refresh
  await refreshAllBehaviourStats();

  // Update job record
  if (job) {
    await db
      .update(systemJobs)
      .set({ lastRunDate: todayIST, updatedAt: sql`NOW()` })
      .where(eq(systemJobs.jobName, "behaviour_stats_refresh"));
  } else {
    await db
      .insert(systemJobs)
      .values({ jobName: "behaviour_stats_refresh", lastRunDate: todayIST });
  }
}

// ═══════════════════════════════════════════
// Read Queries (for API)
// ═══════════════════════════════════════════

export async function getHouseholdStats(villageId: string, ward?: string) {
  const conditions = [eq(householdBehaviourStats.villageId, villageId)];
  if (ward) {
    conditions.push(eq(householdBehaviourStats.ward, ward));
  }

  // JOIN households for headName and houseNumber
  const results = await db
    .select({
      householdId: householdBehaviourStats.householdId,
      ward: householdBehaviourStats.ward,
      totalCollections: householdBehaviourStats.totalCollections,
      collectionsLast7: householdBehaviourStats.collectionsLast7,
      collectionsLast30: householdBehaviourStats.collectionsLast30,
      avgRatingLast10: householdBehaviourStats.avgRatingLast10,
      mixedCountLast7: householdBehaviourStats.mixedCountLast7,
      lastCollectionDate: householdBehaviourStats.lastCollectionDate,
      daysSinceLastCollection: householdBehaviourStats.daysSinceLastCollection,
      lastCollectionType: householdBehaviourStats.lastCollectionType,
      updatedAt: householdBehaviourStats.updatedAt,
      // Joined from households
      headName: households.headName,
      houseNumber: households.houseNumber,
      uid: households.uid,
      phone: households.phone,
      address: households.address,
      latitude: households.latitude,
      longitude: households.longitude,
    })
    .from(householdBehaviourStats)
    .innerJoin(households, eq(households.id, householdBehaviourStats.householdId))
    .where(and(...conditions))
    .orderBy(desc(householdBehaviourStats.daysSinceLastCollection));

  return results;
}

// Get thresholds for a village (with defaults fallback)
export async function getBehaviourThresholds(villageId: string) {
  const [village] = await db
    .select({ behaviourThresholds: villages.behaviourThresholds })
    .from(villages)
    .where(eq(villages.villageId, villageId));

  return (village?.behaviourThresholds as any) || DEFAULT_THRESHOLDS;
}

// Update thresholds
export async function updateBehaviourThresholds(
  villageId: string,
  thresholds: { minAvgRating: number; maxMixed7Days: number; maxInactiveDays: number }
) {
  await db
    .update(villages)
    .set({
      behaviourThresholds: thresholds,
      updatedAt: sql`NOW()`,
    })
    .where(eq(villages.villageId, villageId));

  return thresholds;
}

// Ensure all active households have a stats row (for new/existing households without collections)
export async function ensureAllHouseholdsHaveStats(villageId: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO household_behaviour_stats (village_id, household_id, ward)
    SELECT h.village_id, h.id, h.ward
    FROM households h
    WHERE h.village_id = ${villageId}
      AND h.status = 'active'
      AND h.id NOT IN (
        SELECT household_id FROM household_behaviour_stats WHERE village_id = ${villageId}
      )
  `);
}
