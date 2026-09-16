/**
 * GreenPath Village Manager Mobile — API Service
 *
 * Provides typed REST client methods for the Manager dashboard:
 * - Village details & feature flag configuration
 * - Announcements and village broadcast notices
 * - Issues and open issues
 * - Daily collections summary and KPI pulse
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';
import type {
  ManagerVillageData,
  ManagerAnnouncement,
  ManagerPremiumReportData,
  ManagerDailyCollectionSummary,
  ManagerHouseholdCollectionsResponse,
  VillageBoundary,
  VillageRoad,
  ManagerIssue,
} from '../types/manager';

/**
 * Fetch village details including system rule toggles (location services, weight, attendance, etc.)
 * Calls GET /api/villages/:villageId
 */
export async function fetchManagerVillageData(villageId: string): Promise<ManagerVillageData> {
  const cleanId = villageId.trim();
  const raw = await apiRequest<any>(API_ENDPOINTS.villageDetails(cleanId));

  return {
    id: String(raw.villageId || cleanId || raw.id),
    name: String(raw.name || 'GreenPath Village'),
    state: raw.state,
    district: raw.district,
    taluk: raw.taluk,
    gpName: raw.gpName,
    locationServicesEnabled: Boolean(raw.locationServicesEnabled),
    weightRequired: Boolean(raw.weightRequired),
    imageUploadRequired: Boolean(raw.imageUploadRequired),
    collectorWasteLogEnabled: Boolean(raw.collectorWasteLogEnabled),
    attendanceEnabled: Boolean(raw.attendanceEnabled),
    paymentsEnabled: Boolean(raw.paymentsEnabled),
    notificationRadiusMeters: raw.notificationRadiusMeters,
    notificationWindowStart: raw.notificationWindowStart,
    notificationWindowEnd: raw.notificationWindowEnd,
    totalHouseholds: raw.totalHouseholds,
    activeCollectors: raw.activeCollectors,
    wards: Array.isArray(raw.wards)
      ? raw.wards.filter((w: any) => typeof w === 'string' && w.trim().length > 0)
      : [],
  };
}

/**
 * Fetch announcements broadcast to village workers and citizens.
 * Calls GET /api/announcements
 */
export async function fetchManagerAnnouncements(): Promise<ManagerAnnouncement[]> {
  try {
    const list = await apiRequest<ManagerAnnouncement[]>(API_ENDPOINTS.announcements);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Fetch active issue issues count (open + in_progress only) for the Issues tab badge.
 * Calls GET /api/issues and filters out resolved issues.
 */
export async function fetchManagerOpenIssuesCount(): Promise<number> {
  try {
    const list = await fetchManagerIssues();
    return list.filter((i) => i.status === 'open' || i.status === 'in_progress').length;
  } catch {
    return 0;
  }
}

/**
 * Fetch daily collection summary for reports / collections pulse.
 * Calls GET /api/collections/daily-summary?date=YYYY-MM-DD
 */
export async function fetchManagerDailySummary(
  dateStr: string
): Promise<ManagerDailyCollectionSummary | null> {
  try {
    return await apiRequest<ManagerDailyCollectionSummary>(
      API_ENDPOINTS.managerDailySummary(dateStr)
    );
  } catch {
    return null;
  }
}

/**
 * Fetch collection history and aggregates for a single household.
 * Calls GET /api/waste-collections/household/:uid?limit=:limit&offset=:offset
 */
export async function fetchHouseholdCollectionHistory(
  uid: string,
  limit = 10,
  offset = 0
): Promise<ManagerHouseholdCollectionsResponse> {
  try {
    const res = await apiRequest<ManagerHouseholdCollectionsResponse>(
      API_ENDPOINTS.householdCollections(uid, limit, offset)
    );
    return res || { data: [], stats: { avgRating: 0, totalCollections: 0 } };
  } catch {
    return { data: [], stats: { avgRating: 0, totalCollections: 0 } };
  }
}

/**
 * Fetch premium analytics report data (KPIs, 7-day pulses, ward performance,
 * materials breakdown, fleet sessions, hourly timeline).
 * Calls GET /api/analytics/premium?village=:villageId&date=:date
 */
export async function fetchManagerAnalyticsPremium(
  villageId: string,
  dateStr: string
): Promise<ManagerPremiumReportData | null> {
  try {
    const cleanId = villageId.trim();
    return await apiRequest<ManagerPremiumReportData>(
      API_ENDPOINTS.managerAnalyticsPremium(cleanId, dateStr)
    );
  } catch (err) {
    console.warn('[fetchManagerAnalyticsPremium] Failed to load report data:', err);
    return null;
  }
}

/**
 * Fetch daily attendance for a specific worker type.
 * Calls GET /api/attendance/daily?date=:date&workerType=:workerType
 */
export async function fetchManagerDailyAttendance(
  dateStr: string,
  workerType: 'collector' | 'helper' | 'segregator'
): Promise<{ workers: Array<{ workerName: string; attendance: string | null }> }> {
  try {
    const res = await apiRequest<{
      workers: Array<{ workerName: string; attendance: string | null }>;
    }>(
      `/api/attendance/daily?date=${encodeURIComponent(dateStr)}&workerType=${encodeURIComponent(workerType)}`
    );
    return res || { workers: [] };
  } catch {
    return { workers: [] };
  }
}

/**
 * Fetch official configured wards for a village.
 * Calls GET /api/villages/:villageId/wards
 */
export async function fetchManagerWards(villageId: string): Promise<string[]> {
  try {
    const cleanId = villageId.trim();
    const list = await apiRequest<string[]>(API_ENDPOINTS.managerWards(cleanId));
    return Array.isArray(list)
      ? list.filter((w) => typeof w === 'string' && w.trim().length > 0)
      : [];
  } catch (err) {
    console.warn('[fetchManagerWards] Failed to load wards:', err);
    return [];
  }
}

/**
 * Fetch GIS polygon boundaries for village and wards.
 * Calls GET /api/village-boundaries
 */
export async function fetchVillageBoundaries(): Promise<VillageBoundary[]> {
  try {
    const list = await apiRequest<VillageBoundary[]>(API_ENDPOINTS.villageBoundaries);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[fetchVillageBoundaries] Failed to load boundaries:', err);
    return [];
  }
}

/**
 * Fetch GIS road networks for village.
 * Calls GET /api/village-roads
 */
export async function fetchVillageRoads(): Promise<VillageRoad[]> {
  try {
    const list = await apiRequest<VillageRoad[]>(API_ENDPOINTS.villageRoads);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[fetchVillageRoads] Failed to load roads:', err);
    return [];
  }
}

/**
 * Fetch citizen issues / issues for the manager's village.
 * Calls GET /api/issues
 */
export async function fetchManagerIssues(): Promise<ManagerIssue[]> {
  try {
    const list = await apiRequest<ManagerIssue[]>(API_ENDPOINTS.managerIssues);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[fetchManagerIssues] Failed to load issues:', err);
    return [];
  }
}

/**
 * Update issue status, manager reply, and optional/required proof photo URL.
 * Calls PATCH /api/issues/:id
 */
export async function updateManagerIssue(
  id: number,
  payload: {
    status: string;
    managerReply?: string;
    managerProofPhotoUrl?: string;
  }
): Promise<ManagerIssue> {
  return await apiRequest<ManagerIssue>(API_ENDPOINTS.managerIssueUpdate(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

