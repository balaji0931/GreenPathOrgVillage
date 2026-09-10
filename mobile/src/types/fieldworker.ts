/**
 * Field Worker Types for GreenPath Mobile
 *
 * Dedicated type definitions for Field Worker operations:
 * - QR code lookup & status
 * - Household digitization mapping payload
 * - Household type options
 * - Village metadata & wards
 * - Offline SQLite queue schema
 * - Navigation tabs & stats
 */

export type FieldWorkerTab = 'home' | 'sync' | 'profile';

export type QRCodeStatus = 'notMapped' | 'mapped' | 'assigned';

export interface QRCodeData {
  id?: number;
  uid: string;
  villageId: string;
  status: QRCodeStatus | 'available';
  batchId?: string;
  householdId?: number | null;
  createdAt?: string;
  assignedAt?: string;
}

export interface HouseholdMappingPayload {
  uid: string;
  headName: string;
  phone: string;
  houseNumber: string;
  ward: string;
  householdType: string;
  familySize: number;
  address: string;
  latitude?: number;
  longitude?: number;
  accessRoadId?: number;
  preferredCollectionTime?: string;
}

export interface MappedHousehold {
  id: number;
  uid: string;
  headName: string;
  phone: string;
  houseNumber: string;
  ward: string;
  householdType: string;
  familySize: number;
  address: string;
  latitude?: string;
  longitude?: string;
  status?: string;
  createdAt?: string;
  mappedAt?: string;
}

export interface MappingResponse {
  household: MappedHousehold;
  credentials?: {
    userId: string;
  };
}

export interface HouseholdTypeOption {
  typeCode: string;
  displayName: string;
  monthlyRate?: number;
  description?: string;
}

export interface FieldWorkerVillageData {
  id?: number;
  villageId: string;
  name: string;
  state?: string;
  district?: string;
  taluk?: string;
  wards: string[];
  unitType?: string;
  locationServicesEnabled?: boolean;
}

export interface VillageRoad {
  id: number;
  villageId: string;
  name: string;
  coordinates?: [number, number][];
  distanceMeters?: number;
}

export interface FieldWorkerStats {
  totalMapped: number;
  todayMapped: number;
  pendingSync: number;
}

export type QueueSyncStatus = 'QUEUED' | 'SYNCING' | 'CONFIRMED' | 'FAILED';

export interface QueuedMapping {
  id: number;
  clientRequestId: string;
  uid: string;
  headName: string;
  phone: string;
  houseNumber: string;
  ward: string;
  householdType: string;
  familySize: number;
  address: string;
  latitude?: string;
  longitude?: string;
  accessRoadId?: number;
  preferredCollectionTime?: string;
  payloadJson: string; // Serialized HouseholdMappingPayload
  syncStatus: QueueSyncStatus;
  syncError: string;
  syncAttempts: number;
  createdAt: string;
  syncedAt: string;
}

export interface FieldWorkerQueueStats {
  total: number;
  queued: number;
  syncing: number;
  confirmed: number;
  failed: number;
}
