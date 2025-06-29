// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'moderator' | 'manager' | 'collector' | 'generator';
  villageId?: string;
  isActive: boolean;
  createdAt: string;
}

// Village Types
export interface Village {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  managerPhone: string;
  isActive: boolean;
  createdAt: string;
}

// Household Types
export interface Household {
  id: string;
  headName: string;
  houseNumber: string;
  villageId: string;
  qrCodeUrl: string;
  isActive: boolean;
  createdAt: string;
}

// Collection Types
export interface Collection {
  id: string;
  householdId: string;
  collectorId: string;
  collectedAt: string;
  segregationRating: number;
  isSegregated: boolean;
  isRecycled: boolean;
  hasCompost: boolean;
  photoUrl?: string;
  voiceUrl?: string;
  feedback?: string;
  householdName?: string;
  collectorName?: string;
}

// Issue Types
export interface Issue {
  id: string;
  householdId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
  reportedAt: string;
  resolvedAt?: string;
  managerReply?: string;
  householdName?: string;
}

// Announcement Types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'managers' | 'collectors' | 'households';
  isUrgent: boolean;
  publishDate: string;
  expiryDate?: string;
  createdBy: string;
  villageId?: string;
}

// Stats Types
export interface DashboardStats {
  totalVillages?: number;
  totalHouseholds?: number;
  totalCollectors?: number;
  totalManagers?: number;
  collectionsToday?: number;
  collectionsThisMonth?: number;
  openIssues?: number;
  avgSegregationRating?: number;
  recyclingRate?: number;
  compostRate?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface CollectionForm {
  householdId: string;
  segregationRating: number;
  isSegregated: boolean;
  isRecycled: boolean;
  hasCompost: boolean;
  feedback?: string;
  photoUri?: string;
  voiceUri?: string;
}

export interface IssueForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  imageUri?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  AdminDashboard: undefined;
  ModeratorDashboard: undefined;
  ManagerDashboard: undefined;
  CollectorDashboard: undefined;
  GeneratorDashboard: undefined;
  QRScanner: undefined;
  CollectionForm: { household: Household };
  IssueForm: undefined;
  IssueDetail: { issue: Issue };
  CollectionDetail: { collection: Collection };
  Profile: undefined;
};

// Offline Types
export interface OfflineCollection {
  id: string;
  data: CollectionForm;
  timestamp: number;
  synced: boolean;
}

export interface OfflineFile {
  id: string;
  uri: string;
  type: 'photo' | 'voice';
  timestamp: number;
  synced: boolean;
}