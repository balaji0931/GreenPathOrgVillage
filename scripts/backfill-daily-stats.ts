/**
 * Backfill script: Replay all historical waste_collections
 * to populate the pre-calculated daily stats tables.
 *
 * Run once after schema migration. Safe to re-run (idempotent - truncates stats tables first).
 *
 * Usage: npx tsx scripts/backfill-daily-stats.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { db, pool } from "../server/db";
import {
    villages,
    households,
    collectors,
    wasteCollections,
    dailyVillageStats,
    dailyWardStats,
    dailyVehicleStats,
    dailyHourlyStats,
} from "../shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { toISTDateString, toISTHour } from "../server/modules/analytics/daily-stats.storage";

async function backfill() {
    console.log("🔄 Starting daily stats backfill...\n");

    // Step 0: Truncate stats tables (idempotent re-runs)
    console.log("🗑️  Truncating existing stats...");
    await db.delete(dailyHourlyStats);
    await db.delete(dailyVehicleStats);
    await db.delete(dailyWardStats);
    await db.delete(dailyVillageStats);
    console.log("   Done.\n");

    // Step 1: Update villages.totalHouseholds
    console.log("📊 Updating villages.totalHouseholds...");
    let allVillages = await db.select().from(villages);
    for (const v of allVillages) {
        const [result] = await db
            .select({ total: count() })
            .from(households)
            .where(eq(households.villageId, v.villageId));
        await db
            .update(villages)
            .set({ totalHouseholds: result.total })
            .where(eq(villages.villageId, v.villageId));
        console.log(`   ${v.villageId}: ${result.total} households`);
    }
    console.log("");

    // Step 2: Fetch ALL waste collections with context
    console.log("📦 Fetching all waste collections...");
    const allCollections = await db
        .select({
            collectionDate: wasteCollections.collectionDate,
            segregationRating: wasteCollections.segregationRating,
            householdId: wasteCollections.householdId,
            collectorId: wasteCollections.collectorId,
        })
        .from(wasteCollections)
        .orderBy(wasteCollections.collectionDate);

    console.log(`   Found ${allCollections.length} collections.\n`);

    if (allCollections.length === 0) {
        console.log("✅ No collections to backfill. Done.");
        await pool.end();
        return;
    }

    // Pre-load all households, collectors, villages for lookups
    // IMPORTANT: Reload villages so totalHouseholds reflects the update from Step 1
    console.log("🔗 Loading lookup data...");
    const allHouseholds = await db.select().from(households);
    const allCollectors = await db.select().from(collectors);
    allVillages = await db.select().from(villages);
    const householdMap = new Map(allHouseholds.map(h => [h.id, h]));
    const collectorMap = new Map(allCollectors.map(c => [c.id, c]));
    const villageMap = new Map(allVillages.map(v => [v.villageId, v]));
    console.log(`   ${allHouseholds.length} households, ${allCollectors.length} collectors, ${allVillages.length} villages.\n`);

    // Step 3: Aggregate in-memory
    console.log("🧮 Computing aggregates...\n");

    // Data structures for aggregation
    const villageStatsMap = new Map<string, {
        totalHouseholds: number;
        collectedCount: number;
        segregationSum: number;
    }>();

    const wardStatsMap = new Map<string, {
        totalHouseholds: number;
        collectedCount: number;
    }>();

    const vehicleStatsMap = new Map<string, {
        vehicleName: string;
        collectorNames: Set<string>;
        collectedCount: number;
        firstCollectionAt: Date | null;
        lastCollectionAt: Date | null;
    }>();

    const hourlyStatsMap = new Map<string, number>();

    for (const wc of allCollections) {
        const household = householdMap.get(wc.householdId);
        const collector = collectorMap.get(wc.collectorId);
        if (!household || !collector) continue;

        const villageId = household.villageId;
        const village = villageMap.get(villageId);
        if (!village) continue;

        const collectionDate = new Date(wc.collectionDate as Date);
        const dateStr = toISTDateString(collectionDate);
        const hour = toISTHour(collectionDate);
        const ward = household.ward || "Unknown";
        const regNo = collector.assignedVehicle || "Unassigned";
        const vehiclesList = (village.vehicles as any[]) || [];
        const vehicleEntry = vehiclesList.find((v: any) => v.registrationNumber === regNo);
        const vehicleName = vehicleEntry?.name || regNo;
        const rating = wc.segregationRating ?? 0;

        // Village stats
        const vsKey = `${villageId}|${dateStr}`;
        if (!villageStatsMap.has(vsKey)) {
            villageStatsMap.set(vsKey, {
                totalHouseholds: village.totalHouseholds ?? 0,
                collectedCount: 0,
                segregationSum: 0,
            });
        }
        const vs = villageStatsMap.get(vsKey)!;
        vs.collectedCount++;
        vs.segregationSum += rating;

        // Ward stats
        const wsKey = `${villageId}|${dateStr}|${ward}`;
        if (!wardStatsMap.has(wsKey)) {
            // Count households in this ward (current snapshot)
            const wardHouseholds = allHouseholds.filter(h => h.villageId === villageId && h.ward === ward);
            wardStatsMap.set(wsKey, {
                totalHouseholds: wardHouseholds.length,
                collectedCount: 0,
            });
        }
        wardStatsMap.get(wsKey)!.collectedCount++;

        // Vehicle stats
        const vhKey = `${villageId}|${dateStr}|${regNo}`;
        if (!vehicleStatsMap.has(vhKey)) {
            vehicleStatsMap.set(vhKey, {
                vehicleName,
                collectorNames: new Set(),
                collectedCount: 0,
                firstCollectionAt: null,
                lastCollectionAt: null,
            });
        }
        const vh = vehicleStatsMap.get(vhKey)!;
        vh.collectedCount++;
        vh.collectorNames.add(collector.name);
        if (!vh.firstCollectionAt || collectionDate < vh.firstCollectionAt) vh.firstCollectionAt = collectionDate;
        if (!vh.lastCollectionAt || collectionDate > vh.lastCollectionAt) vh.lastCollectionAt = collectionDate;

        // Hourly stats
        const hKey = `${villageId}|${dateStr}|${hour}|${vehicleName}`;
        hourlyStatsMap.set(hKey, (hourlyStatsMap.get(hKey) || 0) + 1);
    }

    // Step 4: Bulk insert
    console.log("💾 Inserting daily_village_stats...");
    let insertCount = 0;
    for (const [key, stats] of villageStatsMap) {
        const [villageId, reportDate] = key.split("|");
        await db.insert(dailyVillageStats).values({
            villageId,
            reportDate,
            totalHouseholds: stats.totalHouseholds,
            collectedCount: stats.collectedCount,
            segregationSum: String(stats.segregationSum),
        });
        insertCount++;
    }
    console.log(`   Inserted ${insertCount} rows.\n`);

    console.log("💾 Inserting daily_ward_stats...");
    insertCount = 0;
    for (const [key, stats] of wardStatsMap) {
        const [villageId, reportDate, wardName] = key.split("|");
        await db.insert(dailyWardStats).values({
            villageId,
            reportDate,
            wardName,
            totalHouseholds: stats.totalHouseholds,
            collectedCount: stats.collectedCount,
        });
        insertCount++;
    }
    console.log(`   Inserted ${insertCount} rows.\n`);

    console.log("💾 Inserting daily_vehicle_stats...");
    insertCount = 0;
    for (const [key, stats] of vehicleStatsMap) {
        const [villageId, reportDate, registrationNumber] = key.split("|");
        await db.insert(dailyVehicleStats).values({
            villageId,
            reportDate,
            registrationNumber,
            vehicleName: stats.vehicleName,
            collectorNames: Array.from(stats.collectorNames).join(", "),
            collectedCount: stats.collectedCount,
            firstCollectionAt: stats.firstCollectionAt,
            lastCollectionAt: stats.lastCollectionAt,
        });
        insertCount++;
    }
    console.log(`   Inserted ${insertCount} rows.\n`);

    console.log("💾 Inserting daily_hourly_stats...");
    insertCount = 0;
    for (const [key, collectionCount] of hourlyStatsMap) {
        const [villageId, reportDate, hourStr, vehicleName] = key.split("|");
        await db.insert(dailyHourlyStats).values({
            villageId,
            reportDate,
            hour: parseInt(hourStr),
            vehicleName,
            collectionCount,
        });
        insertCount++;
    }
    console.log(`   Inserted ${insertCount} rows.\n`);

    console.log("✅ Backfill complete!");
    await pool.end();
}

backfill().catch((err) => {
    console.error("❌ Backfill failed:", err);
    pool.end();
    process.exit(1);
});
