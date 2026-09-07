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

export async function fetchShiftState(): Promise<ShiftState> {
  return apiRequest<ShiftState>(API_ENDPOINTS.myShift);
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

// ── Profile ─────────────────────────────────────────────────────

export async function changePassword(newPassword: string): Promise<void> {
  return apiRequest(API_ENDPOINTS.changePassword, {
    method: 'POST',
    body: { newPassword },
  });
}
