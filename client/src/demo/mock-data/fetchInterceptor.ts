/**
 * Fetch interceptor - maps /api/* URLs to mock data via memoized getters.
 * This is the SAFETY NET for custom queryFn calls that bypass the cached data.
 * Both this and the cache seeder consume the SAME memoized data → consistent.
 */

import type { DemoRole } from "../DemoContext";
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
  generateCollectorWasteLogSummary,
  generateAuditLogs,
  getModeratorVillages,
  getModeratorManagers,
  getModeratorIssues,
  generateModeratorOverviewStats,
  generatePremiumAnalytics,
} from "./generators";

const DEMO_GENERATOR_INDEX = 41; // Sunita Patil - H-042

/**
 * Returns mock API response for a given URL.
 * Called by the scoped fetch interceptor in DemoProvider when a custom
 * queryFn makes a fetch() call to /api/*.
 */
export function getDemoApiResponse(url: string, role: DemoRole): any {
  try {
    // Strip query params for matching, but keep them for extractors
    const [path, queryString] = url.split("?");
    const params = new URLSearchParams(queryString || "");

    if (process.env.NODE_ENV === "development") {
      console.log("[Demo fetch intercepted]", path);
    }

    // ─── Auth ────────────────────────────────────────────────
    if (path === "/api/auth/user") return DEMO_USERS[role];
    if (path === "/api/auth/csrf-token") return { csrfToken: "demo-csrf-token" };

    // ─── Households ──────────────────────────────────────────
    if (path === "/api/households") return getHouseholds();
    if (path.startsWith("/api/households/")) {
      const uid = path.split("/").pop();
      return getHouseholds().find((h) => h.uid === uid) || null;
    }

    // ─── Collections ─────────────────────────────────────────
    if (path === "/api/waste-collections/village") return getCollections();
    if (path === "/api/waste-collections/collector") {
      return getCollections().filter((c) => c.collectorId === 1);
    }
    if (path === "/api/waste-collections/household") {
      const collections = getCollections();
      const uid = params.get("uid");
      if (uid) {
        const filtered = collections.filter((c) => c.householdUid === uid);
        return { data: filtered.slice(0, 50), stats: { avgRating: 3.8, totalCollections: filtered.length } };
      }
      return { data: collections.slice(0, 50), stats: { avgRating: 3.8, totalCollections: 120 } };
    }
    // Path-based household collection lookup: /api/waste-collections/household/:uid
    if (path.startsWith("/api/waste-collections/household/")) {
      const uid = path.split("/").pop();
      const collections = getCollections();
      const filtered = collections.filter((c) => c.householdUid === uid);
      return { data: filtered.slice(0, 50), stats: { avgRating: 3.8, totalCollections: filtered.length } };
    }

    // ─── Daily Summary ───────────────────────────────────────
    if (path === "/api/collections/daily-summary") {
      return generateDailySummary(params.get("date") || undefined);
    }

    // ─── Analytics ───────────────────────────────────────────
    if (path === "/api/analytics/premium") {
      return generatePremiumAnalytics(params.get("date") || undefined);
    }
    if (path === "/api/manager/stats") return getManagerStats();

    // ─── Behaviour ───────────────────────────────────────────
    if (path === "/api/behaviour/stats") {
      const stats = getBehaviourStats();
      const ward = params.get("ward");
      const thresholds = { minAvgRating: 3, maxMixed7Days: 3, maxInactiveDays: 21, minCollections7Days: 0, minCollections30Days: 0 };
      return {
        stats: ward ? stats.filter((s) => s.ward === ward) : stats,
        thresholds,
      };
    }

    // ─── Collectors ──────────────────────────────────────────
    if (path === "/api/collectors") return getCollectors();
    if (path === "/api/collectors/stats") return getCollectorStats();

    // ─── Village ─────────────────────────────────────────────
    if (path.endsWith("/wards")) return getVillage().wards || ["Ward-1", "Ward-2", "Ward-3"];
    if (path.endsWith("/details")) return getVillage();
    if (path.startsWith("/api/villages")) return getVillage();
    if (path === "/api/village/today-count") return { collectedToday: 72 };

    // ─── Issues ──────────────────────────────────────────────
    if (path === "/api/issues/paginated") {
      const issues = getIssues();
      const page = parseInt(params.get("page") || "1");
      return { data: issues, total: issues.length, page, limit: 20, totalPages: 1 };
    }
    if (path === "/api/issues") return getIssues();

    // ─── Feedback ────────────────────────────────────────────
    if (path === "/api/feedback/village") return getFeedback();

    // ─── Announcements ───────────────────────────────────────
    if (path === "/api/announcements") return getAnnouncements();

    // ─── Field workers ───────────────────────────────────────
    if (path === "/api/fieldworkers") return getFieldWorkers();

    // ─── QR codes ────────────────────────────────────────────
    if (path === "/api/qr-codes") return getQRCodes();
    if (path.startsWith("/api/qr-codes/batch/")) return { message: "Demo: PDF download not available" };
    // Individual QR lookup (fieldworker: scan/search → open form)
    if (path.match(/^\/api\/qr-codes\/[^/]+$/) && !path.includes("batch")) {
      return {
        id: 1,
        uid: `${DEMO_VILLAGE_ID}-H0001`,
        status: "notMapped",
        villageId: DEMO_VILLAGE_ID,
        batchId: "BATCH-DEMO-001",
      };
    }

    // ─── Material Logs ───────────────────────────────────────
    if (path === "/api/material-log/daily-waste") return generateDailyWasteLogs();
    if (path === "/api/material-log/compost") return generateCompostLogs();
    if (path === "/api/material-log/dry-waste-sales") return generateDryWasteSales();
    if (path === "/api/material-log/upload-photo") return { url: "/demo-placeholder.jpg" };
    if (path.startsWith("/api/collector-waste-log/")) return generateCollectorWasteLogSummary();

    // ─── Staff ───────────────────────────────────────────────
    if (path === "/api/staff") return generateStaff(params.get("type") || undefined);

    // ─── Attendance ──────────────────────────────────────────
    if (path === "/api/attendance/daily") return generateAttendanceDaily(params.get("workerType") || undefined);
    if (path === "/api/attendance/centers") return getAttendanceCenters();
    if (path === "/api/attendance/my-shift") {
      return {
        shiftStart: new Date(new Date().setHours(6, 30)).toISOString(),
        shiftEnd: null,
        centerName: "Gram Panchayat Office",
      };
    }

    // ─── Generator-specific ──────────────────────────────────
    if (path === "/api/generator/household") return getHouseholds()[DEMO_GENERATOR_INDEX];

    // ─── Push subscription ───────────────────────────────────
    if (path.startsWith("/api/push")) return { subscribed: true };

    // ─── Household types ─────────────────────────────────────
    if (path.startsWith("/api/household-types")) return getHouseholdTypes().map(h => ({ typeCode: h.type, displayName: h.label }));

    // ─── Audit / Activity Logs ─────────────────────────────────
    if (path === "/api/audit-logs" || path === "/api/activity-logs") return generateAuditLogs();

    // ─── Moderator ───────────────────────────────────────────────
    if (path === "/api/moderator/villages") return getModeratorVillages();
    if (path === "/api/moderator/overview-stats") return generateModeratorOverviewStats(params.get("date") || undefined);
    if (path === "/api/moderator/issues") return getModeratorIssues();
    if (path === "/api/moderator/managers") return getModeratorManagers();
    if (path.match(/^\/api\/moderator\/village\/[^/]+\/managers$/)) {
      const villageId = path.split("/")[4];
      return getModeratorManagers().filter(m => m.villageId === villageId);
    }
    if (path.match(/^\/api\/moderator\/village\/[^/]+\/report$/)) {
      const dateParam = params.get("date") || undefined;
      return generatePremiumAnalytics(dateParam);
    }
    if (path === "/api/moderator/audit-logs") return generateAuditLogs();
    if (path === "/api/profile") return DEMO_USERS[role];

    // ─── Upload (photos) ───────────────────────────────────────
    if (path.startsWith("/api/upload")) return { url: "/demo-placeholder.jpg" };

    // ─── CSRF Token ────────────────────────────────────────────
    if (path === "/api/csrf-token") return { csrfToken: "demo-csrf-token" };

    // ─── Fallback ────────────────────────────────────────────
    if (process.env.NODE_ENV === "development") {
      console.warn("[Demo] No mock handler for:", path);
    }
    return [];
  } catch (err) {
    console.error("[Demo fetch error]", url, err);
    return [];
  }
}
