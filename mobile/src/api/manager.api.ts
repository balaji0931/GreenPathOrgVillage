/**
 * GreenPath Village Manager Mobile — API Service
 *
 * Provides typed REST client methods for the Manager dashboard:
 * - Village details & feature flag configuration
 * - Announcements and village broadcast notices
 * - Issues and open grievances
 * - Daily collections summary and KPI pulse
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';
import type {
  ManagerVillageData,
  ManagerAnnouncement,
  ManagerPremiumReportData,
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
 * Fetch open grievance issues count for the Issues tab badge.
 * Calls GET /api/issues/paginated?page=1&limit=1
 */
export async function fetchManagerOpenIssuesCount(): Promise<number> {
  try {
    const res = await apiRequest<{ total?: number; issues?: any[] }>(
      API_ENDPOINTS.managerIssuesPaginated(1, 1)
    );
    return typeof res?.total === 'number' ? res.total : Array.isArray(res?.issues) ? res.issues.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch daily collection summary for reports / collections pulse.
 * Calls GET /api/collections/daily-summary?date=YYYY-MM-DD
 */
export async function fetchManagerDailySummary(dateStr: string): Promise<any> {
  try {
    return await apiRequest<any>(API_ENDPOINTS.managerDailySummary(dateStr));
  } catch {
    return null;
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

