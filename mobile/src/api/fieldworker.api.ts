/**
 * Field Worker API Service for GreenPath Mobile
 *
 * Dedicated API methods for Field Worker workflow:
 * - QR code validation & lookup
 * - Household-to-QR mapping registration
 * - Village ward & household type metadata
 *
 * Uses the shared apiRequest client which handles Bearer token attachment
 * and automatic token refresh on 401.
 */
import { apiRequest } from './client';
import { API_ENDPOINTS } from '../constants/api';
import type {
  QRCodeData,
  HouseholdMappingPayload,
  MappingResponse,
  HouseholdTypeOption,
  FieldWorkerVillageData,
  VillageRoad,
} from '../types/fieldworker';

/**
 * Look up a QR code by its UID to check its status (mapped vs unmapped)
 * and ensure it belongs to the field worker's assigned village.
 * Calls GET /api/qr-codes/:uid
 */
export async function lookupQRCode(uid: string): Promise<QRCodeData> {
  const cleanUid = uid.trim();
  return apiRequest<QRCodeData>(API_ENDPOINTS.qrLookup(cleanUid));
}

/**
 * Map an unmapped pre-printed QR code to a newly digitized household with GPS coordinates.
 * Calls POST /api/qr-codes/:uid/map
 */
export async function mapHousehold(payload: HouseholdMappingPayload): Promise<MappingResponse> {
  const cleanUid = payload.uid.trim();
  return apiRequest<MappingResponse>(API_ENDPOINTS.qrMap(cleanUid), {
    method: 'POST',
    body: {
      headName: payload.headName.trim(),
      phone: payload.phone.trim(),
      houseNumber: payload.houseNumber.trim(),
      ward: payload.ward.trim(),
      householdType: payload.householdType,
      familySize: payload.familySize,
      address: payload.address.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      accessRoadId: payload.accessRoadId,
      preferredCollectionTime: payload.preferredCollectionTime,
    },
  });
}

/**
 * Fetch available household types for the village (e.g. residential_small, commercial).
 * Calls GET /api/household-types
 */
export async function fetchHouseholdTypes(): Promise<HouseholdTypeOption[]> {
  try {
    const types = await apiRequest<HouseholdTypeOption[]>(API_ENDPOINTS.householdTypes);
    return Array.isArray(types) ? types : [];
  } catch {
    return [];
  }
}

/**
 * Fetch village details including official ward names and village boundary/unit info.
 * Calls GET /api/villages/:villageId
 */
export async function fetchVillageDetails(villageId: string): Promise<FieldWorkerVillageData> {
  return apiRequest<FieldWorkerVillageData>(API_ENDPOINTS.villageDetails(villageId));
}

/**
 * Fetch recorded roads for the assigned village.
 * Calls GET /api/village-roads
 */
export async function fetchVillageRoads(): Promise<VillageRoad[]> {
  try {
    const roads = await apiRequest<VillageRoad[]>(API_ENDPOINTS.villageRoads);
    return Array.isArray(roads) ? roads : [];
  } catch {
    return [];
  }
}
