/**
 * Collector Types for GreenPath Mobile
 *
 * TypeScript interfaces matching the web collector-dashboard.tsx
 * data structures and the server API responses exactly.
 */

// ── Household ───────────────────────────────────────────────────

export interface Household {
  id: number;
  uid: string;
  headName: string;
  houseNumber: string;
  ward: string;
  villageId: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
  status?: string;
}

// ── Collection ──────────────────────────────────────────────────

export type CollectionStatus = 'collected' | 'missed';

export type WasteType = 'wet' | 'dry' | 'sanitary' | 'special_care' | 'mixed';

export interface WasteCollection {
  id: number;
  householdId: number;
  collectorId: number;
  collectionDate: string;
  segregationRating: number;
  remarks?: string;
  photoUrl?: string;
  voiceUrl?: string;
  status: CollectionStatus;
  missedReason?: string;
  wasteTypes?: WasteType[];
  weightKg?: string;
}

export interface CollectionFormData {
  householdUid: string;
  status: CollectionStatus;
  missedReason: string;
  segregationRating: number;
  wasteTypes: WasteType[];
  weightKg: string;
  remarks: string;
  photoUrl: string;
  voiceUrl: string;
  collectionDate?: string;
  latitude?: string;
  longitude?: string;
}

// ── Village ─────────────────────────────────────────────────────

export interface VillageData {
  villageId: string;
  name: string;
  attendanceEnabled?: boolean;
  collectorWasteLogEnabled?: boolean;
  weightRequired?: boolean;
  imageUploadRequired?: boolean;
  unitType?: string;
}

// ── Announcements ───────────────────────────────────────────────

export interface Announcement {
  id: number;
  title: string;
  message: string;
  villageId: string;
  createdAt: string;
  createdBy?: string;
}

// ── Issues ──────────────────────────────────────────────────────

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export type IssueCategory =
  | 'Illegal Dumping'
  | 'Collection Delay'
  | 'Missed Pickup'
  | 'Road Cleanliness'
  | 'Plastic Usage'
  | 'Collector Behavior'
  | 'Infrastructure'
  | 'Other';

export interface Issue {
  id: number;
  title: string;
  description: string;
  category: IssueCategory;
  reportedBy: string;
  villageId: string;
  status: IssueStatus;
  photoUrl?: string;
  managerReply?: string;
  managerProofPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueFormData {
  title: string;
  description: string;
  category: IssueCategory;
  photoUrl?: string;
}

// ── Attendance / Shift ──────────────────────────────────────────

export interface ShiftItem {
  shiftNumber: number;
  startedAt: string | null;
  endedAt: string | null;
  startCenter?: number | null;
  endCenter?: number | null;
  // Helpers
  startTime?: string;
  endTime?: string;
  duration?: number;
  centerName?: string;
}

export type ShiftEntry = ShiftItem;

export interface ShiftState {
  shiftDate?: string;
  isShiftActive: boolean;
  currentShiftNumber: number;
  shifts: ShiftItem[];
  attendanceStatus?: 'present' | 'half_day' | 'absent' | null;
  attendanceRemarks?: string | null;
  // Compatibility fields
  hasActiveShift?: boolean;
  todayShifts?: ShiftItem[];
  completedShifts?: number;
  currentShift?: {
    shiftNumber: number;
    startTime: string;
    centerName?: string;
  };
}

export interface ShiftScanResult {
  eventType: 'shift_start' | 'shift_end';
  shiftNumber: number;
  centerName: string;
  distance: number;
  error?: string;
  maxDistance?: number;
  message?: string;
}

// ── Waste Log ───────────────────────────────────────────────────

export interface WasteLog {
  id: number;
  collectorId?: number;
  villageId?: string;
  date: string;
  wetWasteKg?: string | number;
  dryWasteKg?: string | number;
  sanitaryWasteKg?: string | number;
  specialCareWasteKg?: string | number;
  mixedWasteKg?: string | number;
  remarks?: string;
  wetKg?: number;
  dryKg?: number;
  sanitaryKg?: number;
  specialCareKg?: number;
  mixedKg?: number;
  notes?: string;
  photoUrls?: string[];
  createdAt?: string;
  isOffline?: boolean;
  queuedId?: number;
  syncStatus?: 'QUEUED' | 'SYNCING' | 'CONFIRMED' | 'FAILED';
  syncError?: string;
}

export interface WasteLogFormData {
  date: string;
  wetWasteKg?: string;
  dryWasteKg?: string;
  sanitaryWasteKg?: string;
  specialCareWasteKg?: string;
  mixedWasteKg?: string;
  remarks?: string;
  wetKg?: string;
  dryKg?: string;
  sanitaryKg?: string;
  specialCareKg?: string;
  mixedKg?: string;
  notes?: string;
}

// ── Stats ───────────────────────────────────────────────────────

export interface CollectorStats {
  totalAssigned: number;
  collectedToday: number;
  villageTodayCount: number;
}

// ── QR Scanner ──────────────────────────────────────────────────

export type ScanResult =
  | { kind: 'household'; uid: string }
  | { kind: 'attendance'; token: string }
  | { kind: 'invalid' };
