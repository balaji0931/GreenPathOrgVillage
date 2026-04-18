/**
 * Query Key Factory — single source of truth for all React Query cache keys.
 *
 * Used by demo seeder + fetch interceptor to stay in sync with dashboard queries.
 * Production dashboards still use hardcoded strings (no refactor needed).
 *
 * ⚠️ SYNC WARNING: If a dashboard queryKey changes, update the matching key here.
 *    To find all keys: grep -n "queryKey:" client/src/pages/*-dashboard.tsx
 */

export const DEMO_VILLAGE_ID = "DEMO-V001";

export const qk = {
  // Auth
  auth: () => ["/api/auth/user"] as const,

  // Households
  households: (villageId?: string) => ["/api/households", villageId] as const,

  // Collections
  collectionsVillage: (villageId?: string) => ["/api/waste-collections/village", villageId] as const,
  collectionsCollector: () => ["/api/waste-collections/collector"] as const,
  collectionsHousehold: (uid?: string, limit?: number, offset?: number) =>
    ["/api/waste-collections/household", uid, limit, offset] as const,
  dailySummary: (villageId?: string, date?: string) =>
    ["/api/collections/daily-summary", villageId, date] as const,

  // Analytics
  managerStats: (villageId?: string) => ["/api/manager/stats", villageId] as const,
  premiumAnalytics: (villageId?: string, date?: string) =>
    ["/api/analytics/premium", villageId, date] as const,
  behaviourStats: (villageId?: string, ward?: string) =>
    ["/api/behaviour/stats", villageId, ward] as const,

  // People
  collectors: (villageId?: string) => ["/api/collectors", villageId] as const,
  collectorStats: (villageId?: string) => ["/api/collectors/stats", villageId] as const,
  fieldworkers: (villageId?: string) => ["/api/fieldworkers", villageId] as const,
  staff: (type?: string) => ["/api/staff", type] as const,

  // Village
  village: (villageId?: string) => ["/api/villages", villageId] as const,
  villageById: (id: string) => [`/api/villages/${id}`] as const,
  villageWards: (villageId?: string) => ["/api/villages", villageId, "wards"] as const,
  villageDetails: (villageId?: string) => ["/api/villages", villageId, "details"] as const,
  todayCount: () => ["/api/village/today-count"] as const,

  // Content
  announcements: (villageId?: string) => ["/api/announcements", villageId] as const,
  issues: () => ["/api/issues"] as const,
  issuesPaginated: (villageId?: string) => ["/api/issues/paginated", villageId] as const,
  feedback: (villageId?: string) => ["/api/feedback/village", villageId] as const,

  // QR & Fieldwork
  qrCodes: (villageId?: string) => ["/api/qr-codes", villageId] as const,

  // Generator-specific
  generatorHousehold: () => ["/api/generator/household"] as const,
  pushSubscription: () => ["push-subscription-status"] as const,

  // Attendance
  attendanceDaily: (villageId?: string, date?: string, type?: string) =>
    ["/api/attendance/daily", villageId, date, type] as const,
  attendanceCenters: (villageId?: string) => ["/api/attendance/centers", villageId] as const,
  myShift: () => ["/api/attendance/my-shift"] as const,

  // Fieldworker
  fwVillage: (villageId?: string) => ["village", villageId] as const,
  fwHouseholdTypes: (villageId?: string) => ["household-types", villageId] as const,
} as const;
