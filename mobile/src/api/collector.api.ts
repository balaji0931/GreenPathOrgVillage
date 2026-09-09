/**
 * Collector API Service for GreenPath Mobile
 *
 * All collector-specific API calls. Uses the shared apiRequest client
 * which handles Bearer token attachment and auto-refresh on 401.
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';
import type {
  Household,
  WasteCollection,
  CollectionFormData,
  VillageData,
  Announcement,

  ShiftState,
  ShiftItem,
  WasteLog,
  WasteLogFormData,
} from '../types/collector';

// ── Households ──────────────────────────────────────────────────

export async function fetchHouseholds(): Promise<Household[]> {
  return apiRequest<Household[]>(API_ENDPOINTS.households);
}

// ── Collections ─────────────────────────────────────────────────

export async function fetchCollectorCollections(): Promise<WasteCollection[]> {
  return apiRequest<WasteCollection[]>(API_ENDPOINTS.collectorCollections);
}

export async function submitCollection(data: CollectionFormData): Promise<{ conflict?: boolean; message?: string; collection?: WasteCollection }> {
  return apiRequest(API_ENDPOINTS.wasteCollections, {
    method: 'POST',
    body: data,
  });
}

/**
 * Raw submission used by the sync engine. Includes clientRequestId
 * for server-side idempotency. Distinguishes 409 (already collected)
 * from other errors.
 */
export async function submitCollectionRaw(data: {
  clientRequestId: string;
  householdUid: string;
  status: string;
  missedReason?: string;
  segregationRating: number;
  wasteTypes: string[];
  weightKg?: string;
  photoUrl?: string;
  voiceUrl?: string;
  remarks?: string;
  collectionDate: string;
}): Promise<{ conflict?: boolean; message?: string }> {
  try {
    return await apiRequest(API_ENDPOINTS.wasteCollections, {
      method: 'POST',
      body: data,
    });
  } catch (err: any) {
    if (err.status === 409) {
      return { conflict: true, message: 'Already collected today' };
    }
    throw err;
  }
}

// ── Village Stats ───────────────────────────────────────────────

export async function fetchVillageTodayCount(): Promise<{ collectedToday?: number; count?: number }> {
  return apiRequest<{ collectedToday?: number; count?: number }>(API_ENDPOINTS.villageTodayCount);
}

export async function fetchVillageData(villageId: string): Promise<VillageData> {
  return apiRequest<VillageData>(`/api/villages/${villageId}`);
}

// ── Announcements ───────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return apiRequest<Announcement[]>(API_ENDPOINTS.announcements);
}


// ── Attendance / Shift ──────────────────────────────────────────

export interface AttendanceStatusResponse {
  date: string;
  status: 'present' | 'half_day' | 'absent' | 'not_marked';
  remarks: string | null;
}

export async function fetchShiftState(date?: string): Promise<ShiftState> {
  const params = date ? `?date=${date}` : '';
  const data = await apiRequest<any>(`${API_ENDPOINTS.myShift}${params}`);

  const rawShifts: any[] = Array.isArray(data?.shifts) ? data.shifts : [];
  const shifts: ShiftItem[] = rawShifts.map((s: any) => ({
    shiftNumber: Number(s.shiftNumber) || 1,
    startedAt: s.startedAt || s.startTime || null,
    endedAt: s.endedAt || s.endTime || null,
    startCenter: s.startCenter ?? null,
    endCenter: s.endCenter ?? null,
    startTime: s.startedAt || s.startTime || undefined,
    endTime: s.endedAt || s.endTime || undefined,
    duration: s.startedAt && s.endedAt
      ? Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
      : undefined,
  }));

  const isShiftActive = Boolean(data?.isShiftActive);
  const currentShiftNumber = Number(data?.currentShiftNumber) || (shifts.length > 0 ? shifts[shifts.length - 1].shiftNumber : 0);
  const activeShiftItem = isShiftActive ? shifts.find((s) => !s.endedAt) : undefined;

  return {
    shiftDate: data?.shiftDate,
    isShiftActive,
    currentShiftNumber,
    shifts,
    attendanceStatus: data?.attendanceStatus,
    attendanceRemarks: data?.attendanceRemarks,
    hasActiveShift: isShiftActive,
    todayShifts: shifts,
    completedShifts: shifts.filter((s) => Boolean(s.endedAt)).length,
    currentShift: activeShiftItem
      ? {
          shiftNumber: activeShiftItem.shiftNumber,
          startTime: activeShiftItem.startedAt || '',
        }
      : undefined,
  };
}

export async function fetchMyAttendanceStatus(date?: string): Promise<AttendanceStatusResponse> {
  const params = date ? `?date=${date}` : '';
  return apiRequest<AttendanceStatusResponse>(`${API_ENDPOINTS.myAttendanceStatus}${params}`);
}

export async function scanShift(data: {
  qrToken: string;
  latitude: number;
  longitude: number;
}): Promise<any> {
  return apiRequest(API_ENDPOINTS.scanShift, {
    method: 'POST',
    body: data,
  });
}

// ── Waste Log ───────────────────────────────────────────────────

export async function fetchWasteLogs(): Promise<WasteLog[]> {
  return apiRequest<WasteLog[]>(API_ENDPOINTS.wasteLog);
}

export async function createWasteLog(data: WasteLogFormData): Promise<WasteLog> {
  return apiRequest<WasteLog>(API_ENDPOINTS.wasteLog, {
    method: 'POST',
    body: data,
  });
}

export async function updateWasteLog(id: number, data: Partial<WasteLogFormData>): Promise<WasteLog> {
  return apiRequest<WasteLog>(`${API_ENDPOINTS.wasteLog}/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteWasteLog(id: number): Promise<void> {
  return apiRequest(`${API_ENDPOINTS.wasteLog}/${id}`, {
    method: 'DELETE',
  });
}

// ── Vehicle Report ──────────────────────────────────────────────

export interface VehicleReportSession {
  index: number;
  startTime: string;
  endTime: string;
  count: number;
  durationMs: number;
  breakBeforeMs: number;
}

export interface VehicleReport {
  vehicleName: string | null;
  registrationNumber: string | null;
  collectorNames: string;
  count: number;
  startTime: string | null;
  endTime: string | null;
  sessions: VehicleReportSession[];
  totalWorkMs: number;
  totalBreakMs: number;
  hourlyTimeline: { hour: string; collections: number }[];
}

export async function fetchVehicleReport(date?: string): Promise<VehicleReport> {
  const params = date ? `?date=${date}` : '';
  return apiRequest<VehicleReport>(`/api/collector/vehicle-report${params}`);
}
