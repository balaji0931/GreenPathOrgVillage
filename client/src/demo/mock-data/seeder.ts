/**
 * Cache Seeder - pre-fills a QueryClient with mock data for a given role.
 * Uses MEMOIZED getters from generators (same data as fetch interceptor).
 */

import { QueryClient } from "@tanstack/react-query";
import type { DemoRole } from "../DemoContext";
import { qk, DEMO_VILLAGE_ID } from "@/lib/queryKeys";
import {
  DEMO_USERS,
  getHouseholds,
  getCollections,
  getCollectors,
  getCollectorStats,
  getFieldWorkers,
  getVillage,
  getManagerStats,
  getBehaviourStats,
  getAnnouncements,
  getIssues,
  getFeedback,
  getQRCodes,
  getAttendanceCenters,
  getHouseholdTypes,
  generateDailySummary,
  generatePremiumAnalytics,
  generateAttendanceDaily,
  generateStaff,
  generateDailyWasteLogs,
  generateCompostLogs,
  generateDryWasteSales,
  generateAuditLogs,
  clearMemoizedData,
  getModeratorVillages,
  getModeratorManagers,
  getModeratorIssues,
  generateModeratorOverviewStats,
} from "./generators";

const V = DEMO_VILLAGE_ID;

/** Helper: get recent date strings (YYYY-MM-DD, IST) */
function recentDates(count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setTime(d.getTime() + 5.5 * 60 * 60 * 1000); // IST
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function seedDemoData(client: QueryClient, role: DemoRole): void {
  // Clear memoized data on fresh seed (handles reset)
  clearMemoizedData();

  // Fetch memoized data once
  const households = getHouseholds();
  const announcements = getAnnouncements();
  const village = getVillage();
  const issues = getIssues();

  // ─── Auth (all roles) ───────────────────────────────────────────
  client.setQueryData(qk.auth(), DEMO_USERS[role]);

  // ─── Shared data (all roles) ────────────────────────────────────
  client.setQueryData(qk.households(V), households);
  client.setQueryData(qk.announcements(V), announcements);
  client.setQueryData(qk.village(V), village);
  client.setQueryData(qk.villageWards(V), ["Ward-1", "Ward-2", "Ward-3"]);
  client.setQueryData(qk.issues(), issues);

  // Also seed without villageId (some queries don't pass it)
  client.setQueryData(qk.households(), households);
  client.setQueryData(qk.announcements(), announcements);

  // Village by ID path (some dashboards use /api/villages/:id)
  client.setQueryData(qk.villageById(V), village);
  // Wards - dashboard uses ["/api/villages", villageId, "wards"]
  client.setQueryData(qk.villageWards(V), village.wards);
  client.setQueryData(qk.villageDetails(V), village);

  // ─── Manager ────────────────────────────────────────────────────
  if (role === "manager") {
    const allCollections = getCollections();
    const behaviourStats = getBehaviourStats();
    const collectors = getCollectors();

    client.setQueryData(qk.collectionsVillage(V), allCollections);
    client.setQueryData(qk.managerStats(V), getManagerStats());
    client.setQueryData(qk.collectors(V), collectors);
    client.setQueryData(qk.collectorStats(V), getCollectorStats());
    client.setQueryData(qk.fieldworkers(V), getFieldWorkers());
    client.setQueryData(qk.qrCodes(V), getQRCodes());
    client.setQueryData(qk.feedback(V), getFeedback());
    client.setQueryData(qk.staff(), generateStaff());
    client.setQueryData(qk.staff("collector"), generateStaff("collector"));
    client.setQueryData(qk.staff("fieldworker"), generateStaff("fieldworker"));
    client.setQueryData(qk.attendanceCenters(V), getAttendanceCenters());

    // Material logs
    client.setQueryData(["/api/material-log/daily-waste"], generateDailyWasteLogs());
    client.setQueryData(["/api/material-log/compost"], generateCompostLogs());
    client.setQueryData(["/api/material-log/dry-waste-sales"], generateDryWasteSales());

    // Audit / Activity logs
    client.setQueryData(["/api/audit-logs"], generateAuditLogs());

    // Behaviour stats - seed with and without ward filter
    const thresholds = { minAvgRating: 3, maxMixed7Days: 3, maxInactiveDays: 21, minCollections7Days: 0, minCollections30Days: 0 };
    const allBehaviourData = { stats: behaviourStats, thresholds };
    client.setQueryData(qk.behaviourStats(V, undefined), allBehaviourData);
    client.setQueryData(qk.behaviourStats(V, ""), allBehaviourData);
    client.setQueryData(qk.behaviourStats(V, "all"), allBehaviourData);
    // Also seed with the exact hardcoded key pattern the dashboard uses
    client.setQueryData(["/api/behaviour/stats", V, "all"], allBehaviourData);
    for (const ward of ["Ward-1", "Ward-2", "Ward-3"]) {
      const wardData = { stats: behaviourStats.filter((s) => s.ward === ward), thresholds };
      client.setQueryData(qk.behaviourStats(V, ward), wardData);
      client.setQueryData(["/api/behaviour/stats", V, ward], wardData);
    }

    // Issues paginated (infinite query format)
    client.setQueryData(qk.issuesPaginated(V), {
      pages: [{ data: issues, total: issues.length, page: 1, limit: 20, totalPages: 1 }],
      pageParams: [1],
    });

    // Date-dependent data - seed last 14 days
    for (const date of recentDates(14)) {
      client.setQueryData(qk.dailySummary(V, date), generateDailySummary(date));
      client.setQueryData(qk.premiumAnalytics(V, date), generatePremiumAnalytics(date));
      // Attendance - dashboard uses key: ['/api/attendance/daily', villageId, date, workerType]
      for (const wType of ["collector", "helper", "segregator"]) {
        client.setQueryData(["/api/attendance/daily", V, date, wType], generateAttendanceDaily(wType));
      }
    }
  }

  // ─── Collector ──────────────────────────────────────────────────
  if (role === "collector") {
    const allCollections = getCollections();
    const myCollections = allCollections.filter((c) => c.collectorId === 1);
    client.setQueryData(qk.collectionsCollector(), myCollections);
    client.setQueryData(qk.todayCount(), { count: 72, total: 100 });
    client.setQueryData(qk.villageDetails(V), village);
    
    // Shift state shape fix
    const today = new Date();
    const shiftStart = new Date(today);
    shiftStart.setHours(6, 30, 0, 0);
    client.setQueryData(qk.myShift(), {
      attendanceStatus: "present",
      isShiftActive: true,
      currentShiftNumber: 1,
      shifts: [
        {
          shiftNumber: 1,
          startedAt: shiftStart.toISOString(),
          endedAt: null,
          centerName: "Gram Panchayat Office",
        }
      ]
    });

    // Seed collector waste logs
    client.setQueryData(["/api/collector-waste-log"], generateDailyWasteLogs());
  }

  // ─── Generator (Household) ─────────────────────────────────────
  if (role === "generator") {
    const DEMO_GENERATOR_INDEX = 41; // Sunita Patil - H-042
    const myHousehold = households[DEMO_GENERATOR_INDEX];
    const allCollections = getCollections();
    const myCollections = allCollections.filter((c) => c.householdId === DEMO_GENERATOR_INDEX + 1);

    client.setQueryData(qk.generatorHousehold(), myHousehold);
    // Dashboard uses queryKey: ["/api/waste-collections/household"] (no extra args)
    // and expects a plain array (useQuery<any[]>), not { data, stats }
    client.setQueryData(["/api/waste-collections/household"], myCollections.slice(0, 50));
    client.setQueryData(qk.pushSubscription(), { subscribed: true });
  }

  // ─── Fieldworker ────────────────────────────────────────────────
  if (role === "fieldworker") {
    client.setQueryData(qk.fwVillage(V), village);
    client.setQueryData(qk.fwHouseholdTypes(V), getHouseholdTypes().map(h => ({ typeCode: h.type, displayName: h.label })));
    client.setQueryData(qk.qrCodes(V), getQRCodes());
    client.setQueryData(qk.qrCodes(), getQRCodes());
  }

  // ─── Moderator ─────────────────────────────────────────────────
  if (role === "moderator") {
    client.setQueryData(["/api/moderator/villages"], getModeratorVillages());
    client.setQueryData(["/api/moderator/issues"], getModeratorIssues());
    client.setQueryData(["/api/moderator/managers"], getModeratorManagers());
    client.setQueryData(["/api/moderator/audit-logs"], generateAuditLogs());

    // Overview stats - date-dependent, seed last 14 days + no-date variant
    client.setQueryData(["/api/moderator/overview-stats"], generateModeratorOverviewStats());
    for (const date of recentDates(14)) {
      client.setQueryData(["/api/moderator/overview-stats", date], generateModeratorOverviewStats(date));
    }

    // Per-village managers (used by the custom queryFn)
    const managers = getModeratorManagers();
    const villages = getModeratorVillages();
    for (const v of villages) {
      const villageManagers = managers.filter(m => m.villageId === v.villageId);
      client.setQueryData([`/api/moderator/village/${v.villageId}/managers`], villageManagers);

      // Village detailed report (reuses manager premium analytics shape)
      for (const date of recentDates(14)) {
        client.setQueryData(
          ["/api/moderator/village/report", v.villageId, date],
          generatePremiumAnalytics(date)
        );
      }
    }
  }
}

