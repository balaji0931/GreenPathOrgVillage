import { format, subDays } from "date-fns";
import {
    households,
    wasteCollections,
    collectors,
    dailyVillageStats,
    dailyWardStats,
    dailyVehicleStats,
    dailyHourlyStats,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import * as villageStorage from "../village/village.storage";
import * as dailyWasteLogStorage from "../material-log/daily-waste-log.storage";
import * as dryWasteSalesStorage from "../material-log/dry-waste-sales.storage";
import { deriveVehicleSessions } from "./daily-stats.storage";

export async function getPremiumReportData(villageId: string, date: string): Promise<any> {
    const village = await villageStorage.getVillageByVillageId(villageId);
    if (!village) throw new Error("Village not found");

    const targetDate = new Date(date);
    const sevenDaysAgo = format(subDays(targetDate, 6), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(targetDate, 1), 'yyyy-MM-dd');

    // ── Query 1: Village stats for last 7 days (includes today + yesterday) ──
    const villageStats = await db.select().from(dailyVillageStats)
        .where(and(
            eq(dailyVillageStats.villageId, villageId),
            sql`${dailyVillageStats.reportDate} >= ${sevenDaysAgo}`,
            sql`${dailyVillageStats.reportDate} <= ${date}`
        ))
        .orderBy(dailyVillageStats.reportDate);

    const todayStats = villageStats.find(s => s.reportDate === date);
    const yesterdayStats = villageStats.find(s => s.reportDate === yesterdayStr);

    // ── Query 2: Ward stats for today ──
    const wardStats = await db.select().from(dailyWardStats)
        .where(and(
            eq(dailyWardStats.villageId, villageId),
            eq(dailyWardStats.reportDate, date)
        ));

    // ── Query 3: Vehicle stats for today ──
    const vehicleStatsRows = await db.select().from(dailyVehicleStats)
        .where(and(
            eq(dailyVehicleStats.villageId, villageId),
            eq(dailyVehicleStats.reportDate, date)
        ));

    // ── Query 4: Hourly stats for today ──
    const hourlyRows = await db.select().from(dailyHourlyStats)
        .where(and(
            eq(dailyHourlyStats.villageId, villageId),
            eq(dailyHourlyStats.reportDate, date)
        ));

    // ── Query 5: Material log (existing — unchanged) ──
    const materialLog = await dailyWasteLogStorage.getDailyWasteLogByDate(villageId, date);

    // ── Query 6: Collection timestamps for session derivation ──
    // Align boundaries with IST: 
    // IST Today (e.g. Mar 11) is UTC (Mar 10 18:30:00 to Mar 11 18:29:59)
    const istStartOffset = 5.5 * 60 * 60 * 1000;
    const startOfIstDayUTC = new Date(targetDate.getTime() - istStartOffset);
    const endOfIstDayUTC = new Date(startOfIstDayUTC.getTime() + 86400000);

    // Join through households+collectors to get per-vehicle timestamps
    const collectionRows = await db.select({
        collectionDate: wasteCollections.collectionDate,
        assignedVehicle: collectors.assignedVehicle,
    })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(and(
            eq(households.villageId, villageId),
            sql`${wasteCollections.collectionDate} >= ${startOfIstDayUTC.toISOString()}`,
            sql`${wasteCollections.collectionDate} < ${endOfIstDayUTC.toISOString()}`
        ))
        .orderBy(wasteCollections.collectionDate);

    // ── Derive sessions per vehicle (in-memory, ~0.5ms) ──
    const villageVehicles = (village.vehicles as any[]) || [];
    const regToName: Record<string, string> = {};
    for (const v of villageVehicles) {
        regToName[v.registrationNumber] = v.name || v.registrationNumber;
    }

    // Group collection timestamps by vehicle registration
    const timestampsByVehicle: Record<string, Date[]> = {};
    for (const row of collectionRows) {
        const regNo = row.assignedVehicle || "Unassigned";
        if (!timestampsByVehicle[regNo]) timestampsByVehicle[regNo] = [];
        timestampsByVehicle[regNo].push(new Date(row.collectionDate as Date));
    }

    // ── Assemble KPIs ──
    // Use stats totalHouseholds if available & non-zero, otherwise fall back to live village count
    const totalHouseholds = (todayStats?.totalHouseholds && todayStats.totalHouseholds > 0)
        ? todayStats.totalHouseholds
        : (village.totalHouseholds ?? 0);
    const collectedToday = todayStats?.collectedCount ?? 0;
    const collectedYesterday = yesterdayStats?.collectedCount ?? 0;
    const segSum = Number(todayStats?.segregationSum ?? 0);

    const kpis = {
        totalHouseholds,
        collectedToday,
        collectedYesterday,
        nonCollectedToday: totalHouseholds - collectedToday,
        avgSegregationRating: collectedToday > 0
            ? parseFloat((segSum / collectedToday).toFixed(2))
            : 0,
    };

    // ── 7-Day Pulse ──
    const pulses = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(targetDate, 6 - i), 'yyyy-MM-dd');
        const row = villageStats.find(s => s.reportDate === d);
        const cc = row?.collectedCount ?? 0;
        const ss = Number(row?.segregationSum ?? 0);
        return {
            day: format(subDays(targetDate, 6 - i), 'MMM dd'),
            collections: cc,
            rating: cc > 0 ? parseFloat((ss / cc).toFixed(1)) : 0,
        };
    });

    // ── Ward Performance ──
    const wardsList = (village.wards as string[]) || [];
    const wardPerformance = wardsList.map(wardName => {
        const wRow = wardStats.find(w => w.wardName === wardName);
        const total = wRow?.totalHouseholds ?? 0;
        const collected = wRow?.collectedCount ?? 0;
        return {
            name: wardName,
            total,
            collected,
            nonCollected: total - collected,
        };
    });

    // ── Material Data (unchanged) ──
    const materialData = {
        wet: parseFloat(materialLog?.wetWasteKg || "0"),
        dry: parseFloat(materialLog?.dryWasteKg || "0"),
        rejected: parseFloat(materialLog?.rejectedWasteKg || "0"),
        sanitary: parseFloat(materialLog?.sanitaryWasteKg || "0"),
        isLogged: !!materialLog,
    };

    // ── Vehicle Stats with Sessions ──
    const vehicleStats = villageVehicles.map(v => {
        const row = vehicleStatsRows.find(r => r.registrationNumber === v.registrationNumber);
        const timestamps = timestampsByVehicle[v.registrationNumber] || [];
        const sessionResult = deriveVehicleSessions(timestamps);

        return {
            registrationNumber: v.registrationNumber,
            vehicleName: v.name || v.registrationNumber,
            collectorNames: row?.collectorNames || "Unassigned",
            count: row?.collectedCount ?? 0,
            startTime: row?.firstCollectionAt?.toISOString() ?? null,
            endTime: row?.lastCollectionAt?.toISOString() ?? null,
            sessions: sessionResult.sessions,
            totalWorkMs: sessionResult.totalWorkMs,
            totalBreakMs: sessionResult.totalBreakMs,
        };
    });

    // ── Hourly Timeline ──
    const vehicleColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#10b981'];
    const vehicleNameSet = new Set<string>();
    for (const v of villageVehicles) vehicleNameSet.add(v.name || v.registrationNumber);

    const hourlyMap: Record<number, Record<string, number>> = {};
    for (let h = 5; h <= 18; h++) hourlyMap[h] = {};

    for (const row of hourlyRows) {
        if (row.hour >= 5 && row.hour <= 18) {
            hourlyMap[row.hour][row.vehicleName] = row.collectionCount;
            vehicleNameSet.add(row.vehicleName);
        }
    }

    const vehicleNames = Array.from(vehicleNameSet);
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

    return {
        kpis,
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
        },
    };
}
