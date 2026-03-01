import { format, subDays, addDays } from "date-fns";
import {
    households,
    collectors,
    wasteCollections,
} from "@shared/schema";
import { db } from "../db";
import { eq, count, and, sql, inArray } from "drizzle-orm";
import { getCache, cacheKeys } from "../cache";
import * as villageStorage from "./village.storage";
import * as materialLogStorage from "./material-log.storage";

export async function getPremiumReportData(villageId: string, date: string): Promise<any> {
    const cache = getCache();
    const cacheKey = cacheKeys.dailyReport(villageId, date) + ":premium";
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const yesterdayDate = new Date(targetDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayNextDay = new Date(targetDate);

    try {
        // 1. Village Info (Wards and Vehicles)
        const village = await villageStorage.getVillageByVillageId(villageId);
        if (!village) throw new Error("Village not found");

        // 2. KPIs and Efficiency
        const [householdsCount] = await db
            .select({ count: count() })
            .from(households)
            .where(eq(households.villageId, villageId));

        const [collectedToday] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    eq(households.villageId, villageId),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            );

        const [collectedYesterday] = await db
            .select({ count: count() })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    eq(households.villageId, villageId),
                    sql`${wasteCollections.collectionDate} >= ${yesterdayDate} AND ${wasteCollections.collectionDate} < ${yesterdayNextDay}`
                )
            );

        const [avgRatingToday] = await db
            .select({
                avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    eq(households.villageId, villageId),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            );

        // 3. Pulses (7-day history)
        const pulsePromises = Array.from({ length: 7 }, (_, i) => {
            const d = subDays(targetDate, 6 - i);
            d.setHours(0, 0, 0, 0);
            const nd = addDays(d, 1);

            return db
                .select({
                    count: count(),
                    avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
                })
                .from(wasteCollections)
                .innerJoin(households, eq(wasteCollections.householdId, households.id))
                .where(
                    and(
                        eq(households.villageId, villageId),
                        sql`${wasteCollections.collectionDate} >= ${d} AND ${wasteCollections.collectionDate} < ${nd}`
                    )
                );
        });

        const pulsesRaw = await Promise.all(pulsePromises);
        const pulses = pulsesRaw.map((p, i) => ({
            day: format(subDays(targetDate, 6 - i), 'MMM dd'),
            collections: p[0].count,
            rating: parseFloat((Number(p[0].avgRating) || 0).toFixed(1))
        }));

        // 4. Ward Performance
        const wardsList = (village.wards as string[]) || [];
        const wardPerformance = await Promise.all(wardsList.map(async (wardName) => {
            const [totalInWard] = await db
                .select({ count: count() })
                .from(households)
                .where(and(eq(households.villageId, villageId), eq(households.ward, wardName)));

            const [collectedInWard] = await db
                .select({ count: count() })
                .from(wasteCollections)
                .innerJoin(households, eq(wasteCollections.householdId, households.id))
                .where(
                    and(
                        eq(households.villageId, villageId),
                        eq(households.ward, wardName),
                        sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                    )
                );

            return {
                name: wardName,
                total: totalInWard.count,
                collected: collectedInWard.count,
                nonCollected: totalInWard.count - collectedInWard.count
            };
        }));

        // 5. Material Logs
        const materialLog = await materialLogStorage.getDailyWasteLogByDate(villageId, date);
        const drySales = await materialLogStorage.getDryWasteSalesByVillage(villageId, date, date);

        const materialData = {
            wet: parseFloat(materialLog?.wetWasteKg || "0"),
            dry: parseFloat(materialLog?.dryWasteKg || "0"),
            rejected: parseFloat(materialLog?.rejectedWasteKg || "0"),
            sanitary: parseFloat(materialLog?.sanitaryWasteKg || "0"),
            isLogged: !!materialLog
        };

        // 6. Vehicle Performance with Session Analysis
        const villageVehicles = (village.vehicles as any[]) || [];
        const vehicleStats = await Promise.all(villageVehicles.map(async (v) => {
            // Find collectors assigned to this vehicle
            const vehicleCollectors = await db
                .select()
                .from(collectors)
                .where(and(eq(collectors.villageId, villageId), eq(collectors.assignedVehicle, v.registrationNumber)));

            const collectorIds = vehicleCollectors.map(c => c.id);

            if (collectorIds.length === 0) {
                return {
                    registrationNumber: v.registrationNumber,
                    vehicleName: v.name,
                    collectorNames: "Unassigned",
                    count: 0,
                    startTime: null,
                    endTime: null,
                    sessions: [],
                    totalWorkMs: 0,
                    totalBreakMs: 0
                };
            }

            // Fetch all individual collection timestamps for this vehicle's collectors
            const vehicleCollections = await db
                .select({
                    collectionDate: wasteCollections.collectionDate
                })
                .from(wasteCollections)
                .where(
                    and(
                        inArray(wasteCollections.collectorId, collectorIds),
                        sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                    )
                )
                .orderBy(wasteCollections.collectionDate);

            if (vehicleCollections.length === 0) {
                return {
                    registrationNumber: v.registrationNumber,
                    vehicleName: v.name,
                    collectorNames: vehicleCollectors.map(c => c.name).join(", "),
                    count: 0,
                    startTime: null,
                    endTime: null,
                    sessions: [],
                    totalWorkMs: 0,
                    totalBreakMs: 0
                };
            }

            // Split into sessions using 20-minute gap threshold
            const SESSION_GAP_MS = 20 * 60 * 1000;
            const sessionGroups: Date[][] = [];
            let currentGroup: Date[] = [new Date(vehicleCollections[0].collectionDate as Date)];

            for (let i = 1; i < vehicleCollections.length; i++) {
                const prevTime = new Date(vehicleCollections[i - 1].collectionDate as Date).getTime();
                const currTime = new Date(vehicleCollections[i].collectionDate as Date).getTime();
                if (currTime - prevTime > SESSION_GAP_MS) {
                    sessionGroups.push(currentGroup);
                    currentGroup = [new Date(vehicleCollections[i].collectionDate as Date)];
                } else {
                    currentGroup.push(new Date(vehicleCollections[i].collectionDate as Date));
                }
            }
            sessionGroups.push(currentGroup);

            let totalWorkMs = 0;
            let totalBreakMs = 0;

            const sessions = sessionGroups.map((group, idx) => {
                const start = group[0];
                const end = group[group.length - 1];
                const durationMs = end.getTime() - start.getTime();
                totalWorkMs += durationMs;

                let breakMs = 0;
                if (idx > 0) {
                    const prevEnd = sessionGroups[idx - 1][sessionGroups[idx - 1].length - 1];
                    breakMs = start.getTime() - prevEnd.getTime();
                    totalBreakMs += breakMs;
                }

                return {
                    index: idx + 1,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    count: group.length,
                    durationMs,
                    breakBeforeMs: breakMs
                };
            });

            const overallStart = new Date(vehicleCollections[0].collectionDate as Date);
            const overallEnd = new Date(vehicleCollections[vehicleCollections.length - 1].collectionDate as Date);

            return {
                registrationNumber: v.registrationNumber,
                vehicleName: v.name,
                collectorNames: vehicleCollectors.map(c => c.name).join(", "),
                count: vehicleCollections.length,
                startTime: overallStart.toISOString(),
                endTime: overallEnd.toISOString(),
                sessions,
                totalWorkMs,
                totalBreakMs
            };
        }));

        // 7. Hourly collection timeline broken down by vehicle
        const hourlyRaw = await db
            .select({
                hour: sql<number>`EXTRACT(HOUR FROM ${wasteCollections.collectionDate} + INTERVAL '5 hours 30 minutes')`,
                collectorId: wasteCollections.collectorId,
                cnt: count(),
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
                and(
                    eq(households.villageId, villageId),
                    sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
                )
            )
            .groupBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate} + INTERVAL '5 hours 30 minutes')`, wasteCollections.collectorId)
            .orderBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate} + INTERVAL '5 hours 30 minutes')`);

        // Map collector IDs to vehicle registration numbers, and build reg→name lookup
        const allCollectors = await db.select().from(collectors).where(eq(collectors.villageId, villageId));
        const regToName: Record<string, string> = {};
        for (const v of villageVehicles) {
            regToName[v.registrationNumber] = v.name || v.registrationNumber;
        }
        const collectorVehicleMap: Record<number, string> = {};
        for (const c of allCollectors) {
            const regNum = c.assignedVehicle || 'Unassigned';
            collectorVehicleMap[c.id] = regToName[regNum] || regNum;
        }

        // Build hourly buckets (5 AM to 6 PM = hours 5–18)
        const vehicleColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#10b981'];
        const vehicleSet = new Set<string>();
        // Pre-seed with ALL village vehicles so they all appear even with 0 collections
        for (const v of villageVehicles) {
            vehicleSet.add(v.name || v.registrationNumber);
        }
        const hourlyMap: Record<number, Record<string, number>> = {};

        for (let h = 5; h <= 18; h++) {
            hourlyMap[h] = {};
        }

        for (const row of hourlyRaw) {
            const h = Number(row.hour);
            if (h < 5 || h > 18) continue;
            const vName = collectorVehicleMap[row.collectorId] || 'Unassigned';
            vehicleSet.add(vName);
            hourlyMap[h][vName] = (hourlyMap[h][vName] || 0) + Number(row.cnt);
        }

        const vehicleNames = Array.from(vehicleSet);
        const hourlyTimeline = [];
        for (let h = 5; h <= 18; h++) {
            const slot: any = {
                hour: `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`,
            };
            for (const v of vehicleNames) {
                slot[v] = hourlyMap[h][v] || 0;
            }
            hourlyTimeline.push(slot);
        }

        const result = {
            kpis: {
                totalHouseholds: householdsCount.count,
                collectedToday: collectedToday.count,
                collectedYesterday: collectedYesterday.count,
                nonCollectedToday: householdsCount.count - collectedToday.count,
                avgSegregationRating: parseFloat((Number(avgRatingToday.avg) || 0).toFixed(2))
            },
            pulses,
            wardPerformance,
            materialData,
            vehicleStats,
            collectionTimeline: {
                vehicles: vehicleNames.map((name, i) => ({
                    name,
                    color: vehicleColors[i % vehicleColors.length],
                })),
                hourly: hourlyTimeline,
            }
        };

        await cache.set(cacheKey, result, 300);
        return result;
    } catch (error) {
        console.error("Get premium report data error:", error);
        throw error;
    }
}
