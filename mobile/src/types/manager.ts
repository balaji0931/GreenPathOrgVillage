/**
 * GreenPath Village Manager Mobile — Domain Types & Navigation Models
 *
 * Dedicated types for the Manager workflow:
 * - 5 Primary Tabs: reports, collections, map-viz, issues, more
 * - 22 Sub-screen IDs for tools drilled down from the "More" screen
 * - Village metadata, settings flags, and statistics interfaces
 */

// ── Navigation Tab Types ───────────────────────────────────────

export type ManagerTab = 'reports' | 'collections' | 'map-viz' | 'issues' | 'more';

export type ManagerMoreScreenId =
  // Group 1: Households & QR
  | 'household-details'
  | 'add-household'
  | 'generate-qr'
  | 'download-qr'
  | 'household-performance'
  // Group 2: Field Staff & Personnel
  | 'collectors'
  | 'fieldworkers'
  | 'helpers'
  | 'segregators'
  | 'announcements'
  // Group 3: Material Processing Logs
  | 'daily-waste-logs'
  | 'compost-logs'
  | 'sales-logs'
  // Group 4: Village GIS & Mapping
  | 'road-mapper'
  | 'boundaries'
  // Group 5: Village Governance & Fleet
  | 'vehicles'
  | 'wards'
  | 'village-settings'
  | 'activity-log'
  | 'data-export'
  // Group 6: Payments & Billing
  | 'payments-ledger'
  | 'payments-settings'
  // Group 7: Attendance & Shifts
  | 'att-centers'
  | 'att-mark'
  | 'att-shifts'
  // Group 8: Account & Preferences
  | 'change-password'
  | 'language';

// ── Village Metadata & Settings ────────────────────────────────

export interface ManagerVillageSettings {
  locationServicesEnabled?: boolean;
  weightRequired?: boolean;
  imageUploadRequired?: boolean;
  collectorWasteLogEnabled?: boolean;
  attendanceEnabled?: boolean;
  paymentsEnabled?: boolean;
  notificationRadiusMeters?: number;
  notificationWindowStart?: string;
  notificationWindowEnd?: string;
}

export interface ManagerVillageData {
  id: string;
  name: string;
  state?: string;
  district?: string;
  taluk?: string;
  gpName?: string;
  locationServicesEnabled: boolean;
  weightRequired: boolean;
  imageUploadRequired: boolean;
  collectorWasteLogEnabled: boolean;
  attendanceEnabled: boolean;
  paymentsEnabled: boolean;
  notificationRadiusMeters?: number;
  notificationWindowStart?: string;
  notificationWindowEnd?: string;
  totalHouseholds?: number;
  activeCollectors?: number;
  wards?: string[];
}

// ── Announcement & Alerts ──────────────────────────────────────

export interface ManagerAnnouncement {
  id: number;
  villageId: string;
  message: string;
  targetAudience: 'collectors' | 'generators' | 'all';
  voiceUrl?: string | null;
  createdAt: string;
  creatorName?: string;
}

// ── Navigation Descriptor for More Menu ────────────────────────

export interface MoreMenuItemDescriptor {
  id: ManagerMoreScreenId;
  label: string;
  description: string;
  iconName: string;
  iconFamily?: 'Ionicons' | 'Feather' | 'MaterialCommunityIcons';
  iconColor: string;
  iconBgColor: string;
  badgeCount?: number;
  isGated?: boolean;
}

export interface MoreGroupDescriptor {
  groupId: string;
  title: string;
  badge?: string;
  items: MoreMenuItemDescriptor[];
  isGated?: boolean;
}

// ── Tab 1: Daily Reports & KPI Analytics Types ─────────────────

export interface ReportKpiData {
  totalHouseholds: number;
  collectedToday: number;
  collectedYesterday: number;
  nonCollectedToday: number;
  avgSegregationRating: number;
}

export interface ReportPulseItem {
  day: string;
  collections: number;
  rating: number;
}

export interface ReportWardPerformance {
  name: string;
  total: number;
  collected: number;
  nonCollected: number;
}

export interface ReportMaterialData {
  wet: number;
  dry: number;
  specialCare: number;
  sanitary: number;
  mixed: number;
  isLogged: boolean;
  source: 'manager' | 'collectors' | 'none';
}

export interface ReportVehicleSession {
  index: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  breakBeforeMs: number;
  count: number;
}

export interface ReportVehicleStat {
  registrationNumber: string;
  vehicleName: string;
  collectorNames: string;
  count: number;
  startTime: string | null;
  endTime: string | null;
  sessions: ReportVehicleSession[];
  totalWorkMs: number;
  totalBreakMs: number;
}

export interface ReportVehicleInfo {
  name: string;
  color: string;
}

export interface ReportHourlyTimeline {
  vehicles: ReportVehicleInfo[];
  hourly: Array<{
    hour: string;
    [vehicleName: string]: any;
  }>;
}

export interface ManagerPremiumReportData {
  kpis: ReportKpiData;
  pulses: ReportPulseItem[];
  wardPerformance: ReportWardPerformance[];
  materialData: ReportMaterialData;
  vehicleStats: ReportVehicleStat[];
  collectionTimeline: ReportHourlyTimeline;
}

// ── Tab 2: Collections Screen Domain Types ─────────────────────

export interface ManagerCollectionHousehold {
  id: number;
  uid: string;
  headName: string;
  houseNumber: string;
  ward: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  collected: boolean;
  segregationRating: number | null;
  collectorName: string | null;
  collectionPhotoUrl: string | null;
  collectionVoiceUrl: string | null;
  collectionTime: string | null;
}

export interface ManagerAttentionHousehold {
  householdId: number;
  uid: string;
  headName: string;
  houseNumber: string;
  ward: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  segregationRating: number;
  photoUrl: string | null;
  voiceUrl: string | null;
  collectorName: string;
}

export interface ManagerDailyCollectionSummary {
  date: string;
  needsAttention: ManagerAttentionHousehold[];
  households: ManagerCollectionHousehold[];
}

export interface ManagerHouseholdCollectionItem {
  id: number;
  collectionDate: string;
  segregationRating: number | null;
  remarks: string | null;
  photoUrl: string | null;
  voiceUrl: string | null;
  status: 'collected' | 'missed' | string;
  missedReason: string | null;
  householdId: number;
  collectorId: number | null;
  collectorName: string | null;
}

export interface ManagerHouseholdCollectionsResponse {
  data: ManagerHouseholdCollectionItem[];
  stats: {
    avgRating: number;
    totalCollections: number;
  };
}

// ── GIS & Map Visualization Types ──────────────────────────────

export interface VillageBoundary {
  id: number;
  type: 'village' | 'ward' | string;
  wardName?: string | null;
  coordinates: [number, number][]; // [lat, lng]
}

export interface VillageRoad {
  id: number;
  name: string;
  coordinates: [number, number][]; // [lat, lng]
}

export type MapLayerType =
  | 'collection-status'
  | 'ward-coverage'
  | 'segregation-quality';

// ── Citizen Issues & Issues Types ──────────────────────────

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface ManagerIssue {
  id: number;
  title: string;
  description: string;
  category: string;
  reportedBy: string;
  villageId: string;
  status: IssueStatus;
  photoUrl: string | null;
  managerReply: string | null;
  managerProofPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

