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
