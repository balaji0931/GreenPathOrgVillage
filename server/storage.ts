import {
  type Village,
  type User,
  type Household,
  type Collector,
  type WasteCollection,
  type Issue,
  type Announcement,
  type Feedback,
  type Moderator,
  type ModeratorVillageAssignment,
  type WebsiteFeedback,
  type ContactSubmission,
  type QRCode,
  type DailyWasteLog,
  type CompostProductionLog,
  type DryWasteSale,
  type DryWasteSaleMaterial,
  type InsertVillage,
  type InsertUser,
  type InsertHousehold,
  type InsertCollector,
  type InsertWasteCollection,
  type InsertIssue,
  type InsertAnnouncement,
  type InsertFeedback,
  type InsertModerator,
  type InsertModeratorVillageAssignment,
  type InsertWebsiteFeedback,
  type InsertContactSubmission,
  type InsertQRCode,
  type InsertDailyWasteLog,
  type InsertCompostProductionLog,
  type InsertDryWasteSale,
  type InsertDryWasteSaleMaterial,
} from "@shared/schema";
import * as websiteContactStorage from "./modules/website/website-contact.storage";
import * as announcementStorage from "./modules/announcement/announcement.storage";
import * as issueStorage from "./modules/issue/issue.storage";
import * as feedbackStorage from "./modules/feedback/feedback.storage";
import * as userStorage from "./modules/auth/user.storage";
import * as villageStorage from "./modules/village/village.storage";
import * as householdStorage from "./modules/household/household.storage";
import * as collectorStorage from "./modules/collector/collector.storage";
import * as qrcodeStorage from "./modules/fieldwork/qrcode.storage";
import * as fieldworkerStorage from "./modules/fieldwork/fieldworker.storage";
import * as vehicleStorage from "./modules/vehicle/vehicle.storage";
import * as dailyWasteLogStorage from "./modules/material-log/daily-waste-log.storage";
import * as compostLogStorage from "./modules/material-log/compost-log.storage";
import * as dryWasteSalesStorage from "./modules/material-log/dry-waste-sales.storage";
import * as wasteCollectionStorage from "./modules/waste-collection/waste-collection.storage";
import * as moderatorStorage from "./modules/moderation/moderator.storage";
import * as moderatorStatsStorage from "./modules/moderation/moderator-stats.storage";
import * as moderatorReportsStorage from "./modules/moderation/moderator-reports.storage";
import * as adminStatsStorage from "./modules/analytics/admin-stats.storage";
import * as dailyReportStorage from "./modules/analytics/daily-report.storage";
import * as premiumReportStorage from "./modules/analytics/premium-report.storage";
import * as systemAnalyticsStorage from "./modules/analytics/system-analytics.storage";

import type { IStorage } from "./storage/storage.interface";
export type { IStorage };


export class DatabaseStorage implements IStorage {
  async getUserByUserId(userId: string): Promise<User | undefined> {
    return userStorage.getUserByUserId(userId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return userStorage.createUser(insertUser);
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    return userStorage.updateUserPassword(userId, password);
  }

  async createVillage(insertVillage: InsertVillage): Promise<Village> {
    return villageStorage.createVillage(insertVillage);
  }

  async getVillages(): Promise<Village[]> {
    return villageStorage.getVillages();
  }

  async getVillageByVillageId(villageId: string): Promise<Village | undefined> {
    return villageStorage.getVillageByVillageId(villageId);
  }

  async updateVillage(villageId: string, updates: Partial<Village>): Promise<Village> {
    return villageStorage.updateVillage(villageId, updates);
  }

  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    return householdStorage.createHousehold(insertHousehold);
  }

  async getHouseholdsByVillage(villageId: string): Promise<Household[]> {
    return householdStorage.getHouseholdsByVillage(villageId);
  }

  async getHouseholdsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    ward?: string;
    status?: string;
  } = {}): Promise<{ data: Household[]; total: number; page: number; limit: number; totalPages: number }> {
    return householdStorage.getHouseholdsByVillagePaginated(villageId, options);
  }

  async getHouseholdByUid(uid: string): Promise<Household | undefined> {
    return householdStorage.getHouseholdByUid(uid);
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household> {
    return householdStorage.updateHousehold(id, updates);
  }

  async getWardsByVillage(villageId: string): Promise<string[]> {
    return villageStorage.getWardsByVillage(villageId);
  }

  async addWardToVillage(villageId: string, ward: string): Promise<string[]> {
    return villageStorage.addWardToVillage(villageId, ward);
  }

  async createCollector(insertCollector: InsertCollector): Promise<Collector> {
    return collectorStorage.createCollector(insertCollector);
  }

  async getCollectorsByVillage(villageId: string): Promise<Collector[]> {
    return collectorStorage.getCollectorsByVillage(villageId);
  }

  async getCollectorsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: Collector[]; total: number; page: number; limit: number; totalPages: number }> {
    return collectorStorage.getCollectorsByVillagePaginated(villageId, options);
  }

  async getCollectorByUid(uid: string): Promise<Collector | undefined> {
    return collectorStorage.getCollectorByUid(uid);
  }

  async checkExistingCollection(householdId: number, collectorId: number, date: string): Promise<WasteCollection | undefined> {
    return wasteCollectionStorage.checkExistingCollection(householdId, collectorId, date);
  }

  async createWasteCollection(insertCollection: InsertWasteCollection & { latitude?: string, longitude?: string }): Promise<WasteCollection> {
    return wasteCollectionStorage.createWasteCollection(insertCollection);
  }

  async getCollectionsByHousehold(householdId: number, options?: { limit?: number; offset?: number }): Promise<{
    data: any[];
    stats: { avgRating: number; totalCollections: number }
  }> {
    return wasteCollectionStorage.getCollectionsByHousehold(householdId, options);
  }

  async getCollectionsByCollector(collectorId: number, limit: number = 500): Promise<WasteCollection[]> {
    return wasteCollectionStorage.getCollectionsByCollector(collectorId, limit);
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    return issueStorage.createIssue(insertIssue);
  }

  async getIssuesByVillage(villageId: string): Promise<Issue[]> {
    return issueStorage.getIssuesByVillage(villageId);
  }

  async getIssuesByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ data: Issue[]; total: number; page: number; limit: number; totalPages: number }> {
    return issueStorage.getIssuesByVillagePaginated(villageId, options);
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    return issueStorage.updateIssue(id, updates);
  }

  async createAnnouncement(data: {
    message: string;
    targetAudience: string;
    villageId?: string | null;
    createdBy: string;
    photoUrl?: string | null;
  }) {
    return announcementStorage.createAnnouncement(data);
  }

  async getAnnouncementsByVillage(villageId: string): Promise<Announcement[]> {
    return announcementStorage.getAnnouncementsByVillage(villageId);
  }

  async getGlobalAnnouncements(): Promise<Announcement[]> {
    return announcementStorage.getGlobalAnnouncements();
  }

  async getAllAnnouncements() {
    return announcementStorage.getAllAnnouncements();
  }

  async getAllAnnouncementsPaginated(options: {
    page?: number;
    limit?: number;
    villageId?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    return announcementStorage.getAllAnnouncementsPaginated(options);
  }

  async updateAnnouncement(id: string, data: {
    message: string;
    targetAudience: string;
    photoUrl?: string | null;
    updatedBy: string;
  }) {
    return announcementStorage.updateAnnouncement(id, data);
  }

  async deleteAnnouncement(id: string, deletedBy: string) {
    return announcementStorage.deleteAnnouncement(id, deletedBy);
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    return feedbackStorage.createFeedback(insertFeedback);
  }

  async getFeedbackByCollector(collectorId: number): Promise<Feedback[]> {
    return feedbackStorage.getFeedbackByCollector(collectorId);
  }

  async getFeedbackByHouseholdAndCollector(householdId: number, collectorId: number): Promise<Feedback | undefined> {
    return feedbackStorage.getFeedbackByHouseholdAndCollector(householdId, collectorId);
  }

  async getCollectionById(collectionId: number): Promise<any> {
    return wasteCollectionStorage.getCollectionById(collectionId);
  }


  async getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]> {
    return wasteCollectionStorage.getCollectionsByVillageWithDetails(villageId, date, householdId);
  }

  async getCollectionsByVillageWithDetailsPaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    date?: string;
    collectorId?: number;
    status?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    return wasteCollectionStorage.getCollectionsByVillageWithDetailsPaginated(villageId, options);
  }

  async getDailyCollectionSummary(villageId: string, date: string) {
    return wasteCollectionStorage.getDailyCollectionSummary(villageId, date);
  }

  async getFeedbackByVillageWithFilters(villageId: string, date?: string): Promise<any[]> {
    return feedbackStorage.getFeedbackByVillageWithFilters(villageId, date);
  }

  async getVillageStats(villageId: string): Promise<{
    totalHouseholds: number;
    totalCollectors: number;
    openIssues: number;
    collectionsToday: number;
  }> {
    return adminStatsStorage.getVillageStats(villageId);
  }

  async getAdminStats(): Promise<{
    totalVillages: number;
    totalManagers: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
  }> {
    return adminStatsStorage.getAdminStats();
  }

  async getManagersList(): Promise<User[]> {
    return adminStatsStorage.getManagersList();
  }

  async getManagersListPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    villageId?: string;
  } = {}): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    return adminStatsStorage.getManagersListPaginated(options);
  }


  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return userStorage.updateUser(userId, updates);
  }

  async deleteVillage(villageId: string): Promise<void> {
    return villageStorage.deleteVillage(villageId);
  }

  async generateReport(filters: {
    village?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    return adminStatsStorage.generateReport(filters);
  }

  async getVillageDetails(villageId: string): Promise<any> {
    return adminStatsStorage.getVillageDetails(villageId);
  }

  async addManagerToVillage(villageData: {
    villageId: string;
    managerName: string;
    managerPhone: string;
  }): Promise<User> {
    return userStorage.addManagerToVillage(villageData);
  }


  async deleteUser(userId: string): Promise<void> {
    return userStorage.deleteUser(userId);
  }

  // Enhanced collector operations
  async deleteCollector(id: number): Promise<void> {
    return collectorStorage.deleteCollector(id);
  }

  async getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    complaintsCount: number;
  }> {
    return collectorStorage.getCollectorStats(collectorId);
  }

  // Enhanced household operations

  async deleteHousehold(id: number): Promise<void> {
    return householdStorage.deleteHousehold(id);
  }

  async getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined> {
    return householdStorage.getHouseholdByGeneratorUserId(generatorUserId);
  }

  async getRecentCollectionsByVillage(villageId: string, days: number = 7): Promise<any[]> {
    return wasteCollectionStorage.getRecentCollectionsByVillage(villageId, days);
  }


  async getDailyReportData(villageId?: string, date?: string): Promise<{
    totalHouses: number;
    collected: number;
    remaining: number;
    avgSegregationRating: number;
    ratingDistribution: any[];
    collectionTimeline: any[];
    villagePerformance: any[];
  }> {
    return dailyReportStorage.getDailyReportData(villageId, date);
  }

  async getPremiumReportData(villageId: string, date: string): Promise<any> {
    return premiumReportStorage.getPremiumReportData(villageId, date);
  }

  // Moderator operations
  async createModerator(insertModerator: InsertModerator): Promise<Moderator> {
    return moderatorStorage.createModerator(insertModerator);
  }

  async getModeratorsList(): Promise<Moderator[]> {
    return moderatorStorage.getModeratorsList();
  }

  async updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator> {
    return moderatorStorage.updateModerator(moderatorId, updates);
  }

  async deleteModerator(moderatorId: string): Promise<void> {
    return moderatorStorage.deleteModerator(moderatorId);
  }

  async assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment> {
    return moderatorStorage.assignVillageToModerator(assignment);
  }

  async removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void> {
    return moderatorStorage.removeVillageFromModerator(moderatorId, villageId);
  }

  async getModeratorVillages(moderatorId: string): Promise<any[]> {
    return moderatorStorage.getModeratorVillages(moderatorId);
  }

  async getIssueById(id: number): Promise<Issue | undefined> {
    return issueStorage.getIssueById(id);
  }

  async getManagersByVillage(villageId: string): Promise<User[]> {
    return moderatorStorage.getManagersByVillage(villageId);
  }

  async getModeratorStats(villageIds: string[]): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
  }> {
    return moderatorStatsStorage.getModeratorStats(villageIds);
  }

  async getModeratorReports(villageIds: string[], filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    return moderatorReportsStorage.getModeratorReports(villageIds, filters);
  }

  async getModeratorIssues(villageIds: string[]): Promise<Issue[]> {
    return moderatorReportsStorage.getModeratorIssues(villageIds);
  }

  async getModeratorCollectors(villageIds: string[]): Promise<any[]> {
    return moderatorStatsStorage.getModeratorCollectors(villageIds);
  }

  async getModeratorHouseholds(villageIds: string[]): Promise<any[]> {
    return moderatorStatsStorage.getModeratorHouseholds(villageIds);
  }

  async getModeratorSystemAnalytics(villageIds: string[], selectedVillageId?: string): Promise<{
    totalCollections: number;
    avgRating: number;
    villageStats: any[];
    totalCollectionsThisWeek: number;
    averageSegregationRating: number;
    topPerformingVillages: any[];
    collectionTrends: any[];
    segregationRateDistribution: any[];
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalCollectionsToday: number;
  }> {
    return moderatorReportsStorage.getModeratorSystemAnalytics(villageIds, selectedVillageId);
  }

  async getModeratorDailyReportData(villageIds: string[], date?: string): Promise<{
    totalHouses: number;
    collected: number;
    remaining: number;
    avgSegregationRating: number;
    ratingDistribution: any[];
    collectionTimeline: any[];
    villagePerformance: any[];
    compostingData: any;
  }> {
    return moderatorReportsStorage.getModeratorDailyReportData(villageIds, date);
  }

  async getSystemAnalytics(villageFilter?: string): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalCollectionsToday: number;
    totalCollectionsThisWeek: number;
    averageSegregationRating: number;
    topPerformingVillages: any[];
    collectionTrends: any[];
    segregationRateDistribution: any;
  }> {
    return systemAnalyticsStorage.getSystemAnalytics(villageFilter);
  }


  // Website feedback operations
  async createWebsiteFeedback(insertFeedback: InsertWebsiteFeedback): Promise<WebsiteFeedback> {
    return websiteContactStorage.createWebsiteFeedback(insertFeedback);
  }

  async getWebsiteFeedbacks(): Promise<WebsiteFeedback[]> {
    return websiteContactStorage.getWebsiteFeedbacks();
  }

  // Contact submissions operations
  async createContactSubmission(insertContact: InsertContactSubmission): Promise<ContactSubmission> {
    return websiteContactStorage.createContactSubmission(insertContact);
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return websiteContactStorage.getContactSubmissions();
  }

  // QR Code operations
  async createQRCode(insertQRCode: InsertQRCode): Promise<QRCode> {
    return qrcodeStorage.createQRCode(insertQRCode);
  }

  async createBatchQRCodes(insertQRCodes: InsertQRCode[]): Promise<QRCode[]> {
    return qrcodeStorage.createBatchQRCodes(insertQRCodes);
  }

  async getQRCodeByUid(uid: string): Promise<QRCode | undefined> {
    return qrcodeStorage.getQRCodeByUid(uid);
  }

  async getQRCodesByVillage(villageId: string): Promise<QRCode[]> {
    return qrcodeStorage.getQRCodesByVillage(villageId);
  }

  async getQRCodesByBatch(batchId: string): Promise<QRCode[]> {
    return qrcodeStorage.getQRCodesByBatch(batchId);
  }

  async updateQRCodeStatus(uid: string, status: string, householdId?: number): Promise<QRCode> {
    return qrcodeStorage.updateQRCodeStatus(uid, status, householdId);
  }

  async getNextBatchId(villageId: string): Promise<string> {
    return qrcodeStorage.getNextBatchId(villageId);
  }

  async getMaxHouseNumber(villageId: string): Promise<number> {
    return qrcodeStorage.getMaxHouseNumber(villageId);
  }

  async getNextQRCodeUid(villageId: string, count: number): Promise<string[]> {
    return qrcodeStorage.getNextQRCodeUid(villageId, count);
  }

  // Field worker operations
  async getFieldWorkersByVillage(villageId: string): Promise<User[]> {
    return fieldworkerStorage.getFieldWorkersByVillage(villageId);
  }

  async deleteFieldWorker(userId: string): Promise<void> {
    return fieldworkerStorage.deleteFieldWorker(userId);
  }

  async addVehicleToVillage(villageId: string, vehicle: { registrationNumber: string; name: string; collectorIds: number[] }): Promise<void> {
    return vehicleStorage.addVehicleToVillage(villageId, vehicle);
  }

  async removeVehicleFromVillage(villageId: string, registrationNumber: string): Promise<void> {
    return vehicleStorage.removeVehicleFromVillage(villageId, registrationNumber);
  }

  async updateVehicleInVillage(villageId: string, registrationNumber: string, updates: { name: string; collectorIds: number[] }): Promise<void> {
    return vehicleStorage.updateVehicleInVillage(villageId, registrationNumber, updates);
  }

  async updateCollectorVehicle(collectorId: number, registrationNumber: string | null): Promise<void> {
    return vehicleStorage.updateCollectorVehicle(collectorId, registrationNumber);
  }

  // =====================================================
  // MATERIAL & OUTPUT LOG OPERATIONS (Manager-only)
  // =====================================================

  // Daily Waste Log Operations
  async createDailyWasteLog(log: InsertDailyWasteLog): Promise<DailyWasteLog> {
    return dailyWasteLogStorage.createDailyWasteLog(log);
  }

  async getDailyWasteLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<DailyWasteLog[]> {
    return dailyWasteLogStorage.getDailyWasteLogsByVillage(villageId, startDate, endDate);
  }

  async getDailyWasteLogByDate(villageId: string, date: string): Promise<DailyWasteLog | undefined> {
    return dailyWasteLogStorage.getDailyWasteLogByDate(villageId, date);
  }

  async updateDailyWasteLog(id: number, updates: Partial<DailyWasteLog>): Promise<DailyWasteLog> {
    return dailyWasteLogStorage.updateDailyWasteLog(id, updates);
  }

  async deleteDailyWasteLog(id: number): Promise<void> {
    return dailyWasteLogStorage.deleteDailyWasteLog(id);
  }

  // Compost Production Log Operations
  async createCompostProductionLog(log: InsertCompostProductionLog): Promise<CompostProductionLog> {
    return compostLogStorage.createCompostProductionLog(log);
  }

  async getCompostProductionLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<CompostProductionLog[]> {
    return compostLogStorage.getCompostProductionLogsByVillage(villageId, startDate, endDate);
  }

  async getCompostProductionLogById(id: number): Promise<CompostProductionLog | undefined> {
    return compostLogStorage.getCompostProductionLogById(id);
  }

  async updateCompostProductionLog(id: number, updates: Partial<CompostProductionLog>): Promise<CompostProductionLog> {
    return compostLogStorage.updateCompostProductionLog(id, updates);
  }

  async deleteCompostProductionLog(id: number): Promise<void> {
    return compostLogStorage.deleteCompostProductionLog(id);
  }

  // Dry Waste Sales Operations
  async createDryWasteSale(sale: InsertDryWasteSale, materials: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    return dryWasteSalesStorage.createDryWasteSale(sale, materials);
  }

  async getDryWasteSalesByVillage(villageId: string, startDate?: string, endDate?: string): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] })[]> {
    return dryWasteSalesStorage.getDryWasteSalesByVillage(villageId, startDate, endDate);
  }

  async getDryWasteSaleById(id: number): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] }) | undefined> {
    return dryWasteSalesStorage.getDryWasteSaleById(id);
  }

  async updateDryWasteSale(id: number, saleUpdates: Partial<DryWasteSale>, materials?: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    return dryWasteSalesStorage.updateDryWasteSale(id, saleUpdates, materials);
  }

  async deleteDryWasteSale(id: number): Promise<void> {
    return dryWasteSalesStorage.deleteDryWasteSale(id);
  }
}

export const storage = new DatabaseStorage();