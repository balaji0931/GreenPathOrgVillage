import bcrypt from "bcrypt";
import {
  villages,
  users,
  households,
  collectors,
  wasteCollections,
  issues,
  announcements,
  feedback,
  payments,
  moderators,
  moderatorVillageAssignments,
  monthlyVillageStats,
  websiteFeedback,
  contactSubmissions,
  qrCodes,
  type Village,
  type User,
  type Household,
  type Collector,
  type WasteCollection,
  type Issue,
  type Announcement,
  type Feedback,
  type Payment,
  type Moderator,
  type ModeratorVillageAssignment,
  type MonthlyVillageStats,
  type WebsiteFeedback,
  type ContactSubmission,
  type QRCode,
  type InsertVillage,
  type InsertUser,
  type InsertHousehold,
  type InsertCollector,
  type InsertWasteCollection,
  type InsertIssue,
  type InsertAnnouncement,
  type InsertFeedback,
  type InsertPayment,
  type InsertModerator,
  type InsertModeratorVillageAssignment,
  type InsertMonthlyVillageStats,
  type InsertWebsiteFeedback,
  type InsertContactSubmission,
  type InsertQRCode,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, avg, sum, gte, lte, isNotNull, and, or, like, asc, sql, lt, inArray, isNull } from "drizzle-orm";
import { getCache, cacheKeys } from "./cache";

export interface IStorage {
  // User operations
  getUserByUserId(userId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, password: string): Promise<void>;

  // Village operations
  createVillage(village: InsertVillage): Promise<Village>;
  getVillages(): Promise<Village[]>;
  getVillageByVillageId(villageId: string): Promise<Village | undefined>;
  updateVillage(villageId: string, updates: Partial<Village>): Promise<Village>;

  // Household operations
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHouseholdsByVillage(villageId: string): Promise<Household[]>;
  getHouseholdByUid(uid: string): Promise<Household | undefined>;
  updateHousehold(id: number, updates: Partial<Household>): Promise<Household>;
  getWardsByVillage(villageId: string): Promise<string[]>;
  addWardToVillage(villageId: string, ward: string): Promise<string[]>;
  markQRCodesPrinted(householdIds: number[]): Promise<void>;

  // Collector operations
  createCollector(collector: InsertCollector): Promise<Collector>;
  getCollectorsByVillage(villageId: string): Promise<Collector[]>;
  getCollectorByUid(uid: string): Promise<Collector | undefined>;

  // Waste collection operations
  createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection>;
  getCollectionsByHousehold(householdId: number): Promise<WasteCollection[]>;
  getCollectionsByCollector(collectorId: number): Promise<WasteCollection[]>;
  checkExistingCollection(householdId: number, collectorId: number, date: string): Promise<WasteCollection | undefined>;

  // Issue operations
  createIssue(issue: InsertIssue): Promise<Issue>;
  getIssuesByVillage(villageId: string): Promise<Issue[]>;
  updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;

  // Enhanced collection operations for manager
  getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]>;

  // Enhanced feedback operations for manager
  getFeedbackByVillageWithFilters(villageId: string, date?: string): Promise<any[]>;

  // Announcement operations
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncementsByVillage(villageId: string): Promise<Announcement[]>;
  getGlobalAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<any[]>;
  updateAnnouncement(id: string, data: {
    message: string;
    targetAudience: string;
    photoUrl?: string | null;
    updatedBy: string;
  }): Promise<any>;
  deleteAnnouncement(id: string, deletedBy: string): Promise<any>;

  // Feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedbackByCollector(collectorId: number): Promise<Feedback[]>;
  getFeedbackByHouseholdAndCollector(householdId: number, collectorId: number): Promise<Feedback | undefined>;

  // Dashboard stats
  getVillageStats(villageId: string): Promise<{
    totalHouseholds: number;
    totalCollectors: number;
    openIssues: number;
    collectionsToday: number;
  }>;

  getAdminStats(): Promise<{
    totalVillages: number;
    totalManagers: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
  }>;

  // Admin management methods
  getManagersList(): Promise<User[]>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  deleteVillage(villageId: string): Promise<void>;
  generateReport(filters: {
    village?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any>;
  getVillageDetails(villageId: string): Promise<any>;
  addManagerToVillage(villageData: { villageId: string; managerName: string; managerPhone: string }): Promise<User>;



  // Enhanced collector operations
  deleteCollector(id: number): Promise<void>;
  getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    complaintsCount: number;
  }>;


  // Enhanced household operations
  updateHousehold(id: number, updates: Partial<Household>): Promise<Household>;
  deleteHousehold(id: number): Promise<void>;

  getRecentCollectionsByVillage(villageId: string, days?: number): Promise<any[]>;
  getSystemAnalytics(): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalCollectionsToday: number;
    totalCollectionsThisWeek: number;
    averageSegregationRating: number;
    topPerformingVillages: any[];
    collectionTrends: any[];
    segregationRateDistribution: any;
  }>;
  getDailyReportData(villageId?: string, date?: string): Promise<{
    totalHouses: number;
    collected: number;
    remaining: number;
    avgSegregationRating: number;
    ratingDistribution: any[];
    collectionTimeline: any[];
    villagePerformance: any[];
  }>;
  getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined>;

  // Moderator operations
  createModerator(moderator: InsertModerator): Promise<Moderator>;
  getModeratorsList(): Promise<Moderator[]>;
  updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator>;
  deleteModerator(moderatorId: string): Promise<void>;
  assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment>;
  removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void>;
  getModeratorVillages(moderatorId: string): Promise<any[]>;

  // Website feedback operations
  createWebsiteFeedback(feedback: InsertWebsiteFeedback): Promise<WebsiteFeedback>;
  getWebsiteFeedbacks(): Promise<WebsiteFeedback[]>;

  // Contact submissions operations
  createContactSubmission(contact: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;

  // Phase 2: Monthly village stats operations
  createOrUpdateMonthlyStats(stats: InsertMonthlyVillageStats): Promise<MonthlyVillageStats>;
  getMonthlyStatsByVillageAndMonth(villageId: string, month: string): Promise<MonthlyVillageStats | undefined>;
  backfillHistoricalStats(): Promise<number>; // Returns number of records created

  // Phase 3: Daily stats update for current month
  updateCurrentMonthStats(): Promise<number>; // Returns number of records updated

  // QR Code operations (for field worker mapping)
  createQRCode(qrCode: InsertQRCode): Promise<QRCode>;
  createBatchQRCodes(qrCodes: InsertQRCode[]): Promise<QRCode[]>;
  getQRCodeByUid(uid: string): Promise<QRCode | undefined>;
  getQRCodesByVillage(villageId: string): Promise<QRCode[]>;
  getUnmappedQRCodesByVillage(villageId: string): Promise<QRCode[]>;
  getQRCodesByBatch(batchId: string): Promise<QRCode[]>;
  updateQRCodeStatus(uid: string, status: string, householdId?: number): Promise<QRCode>;
  getNextBatchId(villageId: string): Promise<string>;
  getNextQRCodeUid(villageId: string, count: number): Promise<string[]>;

  // Field worker operations
  getFieldWorkersByVillage(villageId: string): Promise<User[]>;
  deleteFieldWorker(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByUserId(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password, isFirstLogin: false })
      .where(eq(users.userId, userId));
  }

  async createVillage(insertVillage: InsertVillage): Promise<Village> {
    const cache = getCache();
    const [village] = await db
      .insert(villages)
      .values(insertVillage)
      .returning();
    
    // Invalidate village caches
    await cache.delete(cacheKeys.villages());
    await cache.clear('villages:paginated:*'); // Clear all paginated caches
    
    return village;
  }

  async getVillages(): Promise<Village[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.villages());
    if (cached) return cached;

    const result = await db.select().from(villages).orderBy(villages.villageId).limit(500); // Safety limit
    await cache.set(cacheKeys.villages(), result, 3600); // 1 hour TTL
    return result;
  }

  async getVillagesPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: Village[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.villagesPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search) return cached;

    let whereClause = undefined;
    if (options.search) {
      whereClause = or(
        like(villages.name, `%${options.search}%`),
        like(villages.villageId, `%${options.search}%`)
      );
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(villages)
      .where(whereClause);

    const data = await db
      .select()
      .from(villages)
      .where(whereClause)
      .orderBy(villages.villageId)
      .limit(limit)
      .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search) {
      await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
  }

  async getVillageByVillageId(villageId: string): Promise<Village | undefined> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.village(villageId));
    if (cached) return cached;

    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    if (village) {
      await cache.set(cacheKeys.village(villageId), village, 3600);
    }
    return village || undefined;
  }

  async updateVillage(villageId: string, updates: Partial<Village>): Promise<Village> {
    const cache = getCache();
    const [village] = await db
      .update(villages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(villages.villageId, villageId))
      .returning();
    
    // Invalidate all village caches including paginated
    await cache.delete(cacheKeys.village(villageId));
    await cache.delete(cacheKeys.villages());
    await cache.delete(cacheKeys.villageDetails(villageId));
    await cache.clear('villages:paginated:*'); // Clear all paginated village caches
    
    return village;
  }

  async updateVillagePaymentSettings(villageId: string, paymentsEnabled: boolean): Promise<Village> {
    const [village] = await db
      .update(villages)
      .set({ paymentsEnabled, updatedAt: new Date() })
      .where(eq(villages.villageId, villageId))
      .returning();
    return village;
  }

  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const cache = getCache();
    const [household] = await db
      .insert(households)
      .values(insertHousehold)
      .returning();
    
    // Invalidate households cache
    await cache.delete(cacheKeys.households(insertHousehold.villageId));
    await cache.clear(`households:${insertHousehold.villageId}:*`);
    await cache.delete(cacheKeys.villageDetails(insertHousehold.villageId));
    await cache.delete(cacheKeys.villageStats(insertHousehold.villageId));
    
    return household;
  }

  async getHouseholdsByVillage(villageId: string): Promise<Household[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.households(villageId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(households)
      .where(eq(households.villageId, villageId))
      .orderBy(households.uid)
      .limit(5000); // Safety limit - use paginated method for larger datasets
    
    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  async getHouseholdsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
    ward?: string;
    status?: string;
  } = {}): Promise<{ data: Household[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    let conditions = [eq(households.villageId, villageId)];
    
    if (options.search) {
      conditions.push(
        or(
          like(households.headName, `%${options.search}%`),
          like(households.uid, `%${options.search}%`),
          like(households.houseNumber, `%${options.search}%`)
        )!
      );
    }
    
    if (options.ward && options.ward !== 'all') {
      conditions.push(eq(households.ward, options.ward));
    }
    
    if (options.status && options.status !== 'all') {
      conditions.push(eq(households.status, options.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(households)
      .where(whereClause);

    const data = await db
      .select()
      .from(households)
      .where(whereClause)
      .orderBy(households.uid)
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  async getHouseholdByUid(uid: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.uid, uid));
    return household || undefined;
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household> {
    const cache = getCache();
    const [household] = await db
      .update(households)
      .set({ ...updates })
      .where(eq(households.id, id))
      .returning();
    
    // Invalidate households cache
    await cache.delete(cacheKeys.households(household.villageId));
    await cache.clear(`households:${household.villageId}:*`);
    await cache.delete(cacheKeys.villageDetails(household.villageId));
    
    return household;
  }

  async getWardsByVillage(villageId: string): Promise<string[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.wards(villageId));
    if (cached) return cached;

    const [village] = await db
      .select({ wards: villages.wards })
      .from(villages)
      .where(eq(villages.villageId, villageId));
    
    const wards = (village?.wards || [])
      .filter((ward: string | null) => ward && ward.trim() !== '')
      .sort();
    
    await cache.set(cacheKeys.wards(villageId), wards, 3600);
    return wards;
  }

  async addWardToVillage(villageId: string, ward: string): Promise<string[]> {
    const cache = getCache();
    
    const [village] = await db
      .select({ wards: villages.wards })
      .from(villages)
      .where(eq(villages.villageId, villageId));
    
    const existingWards = village?.wards || [];
    if (existingWards.includes(ward)) {
      throw new Error("Ward already exists");
    }
    
    const updatedWards = [...existingWards, ward].sort();
    
    await db
      .update(villages)
      .set({ wards: updatedWards, updatedAt: new Date() })
      .where(eq(villages.villageId, villageId));
    
    await cache.delete(cacheKeys.wards(villageId));
    await cache.delete(cacheKeys.village(villageId));
    
    return updatedWards;
  }

  async createCollector(insertCollector: InsertCollector): Promise<Collector> {
    const cache = getCache();
    const [collector] = await db
      .insert(collectors)
      .values(insertCollector)
      .returning();
    
    // Invalidate collector caches
    await cache.delete(cacheKeys.collectors(insertCollector.villageId));
    await cache.clear(`collectors:${insertCollector.villageId}:*`);
    await cache.delete(cacheKeys.villageDetails(insertCollector.villageId));
    await cache.delete(cacheKeys.villageStats(insertCollector.villageId));
    
    return collector;
  }

  async getCollectorsByVillage(villageId: string): Promise<Collector[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.collectors(villageId));
    if (cached) return cached;

    const result = await db
      .select()
      .from(collectors)
      .where(eq(collectors.villageId, villageId))
      .orderBy(collectors.uid)
      .limit(500); // Safety limit
    
    await cache.set(cacheKeys.collectors(villageId), result, 1800); // 30 min TTL
    return result;
  }

  async getCollectorsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: Collector[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    
    const cacheKey = cacheKeys.collectorsPaginated(villageId, page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search) return cached;

    let conditions = [eq(collectors.villageId, villageId)];
    
    if (options.search) {
      conditions.push(
        or(
          like(collectors.name, `%${options.search}%`),
          like(collectors.uid, `%${options.search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(collectors)
      .where(whereClause);

    const data = await db
      .select()
      .from(collectors)
      .where(whereClause)
      .orderBy(collectors.uid)
      .limit(limit)
      .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search) {
      await cache.set(cacheKey, result, 900); // 15 min TTL
    }
    return result;
  }

  async getCollectorByUid(uid: string): Promise<Collector | undefined> {
    const [collector] = await db.select().from(collectors).where(eq(collectors.uid, uid));
    return collector || undefined;
  }

  async checkExistingCollection(householdId: number, collectorId: number, date: string): Promise<WasteCollection | undefined> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const [existing] = await db
      .select()
      .from(wasteCollections)
      .where(
        and(
          eq(wasteCollections.householdId, householdId),
          eq(wasteCollections.collectorId, collectorId),
          and(
            gte(wasteCollections.collectionDate, startDate),
            lte(wasteCollections.collectionDate, endDate)
          )
        )
      )
      .limit(1);
    
    return existing;
  }

  async createWasteCollection(insertCollection: InsertWasteCollection): Promise<WasteCollection> {
    const cache = getCache();
    const [collection] = await db
      .insert(wasteCollections)
      .values(insertCollection as any)
      .returning();
    
    // Invalidate collections cache - lookup household to get villageId
    const [household] = await db.select({ villageId: households.villageId })
      .from(households)
      .where(eq(households.id, insertCollection.householdId))
      .limit(1);
    
    if (household?.villageId) {
      await cache.delete(cacheKeys.wasteCollections(household.villageId));
      await cache.clear(`collections:${household.villageId}:*`);
      await cache.delete(cacheKeys.villageStats(household.villageId));
      await cache.delete(cacheKeys.adminStats());
    }
    
    return collection;
  }

  async getCollectionsByHousehold(householdId: number, limit: number = 100): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit);
  }

  async getCollectionsByHouseholdPaginated(householdId: number, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: WasteCollection[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId));

    const data = await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  async getCollectionsByCollector(collectorId: number, limit: number = 100): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.collectorId, collectorId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit);
  }

  async getCollectionsByCollectorPaginated(collectorId: number, options: {
    page?: number;
    limit?: number;
    date?: string;
  } = {}): Promise<{ data: WasteCollection[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    let conditions = [eq(wasteCollections.collectorId, collectorId)];

    if (options.date) {
      const startDate = new Date(options.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(options.date);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(gte(wasteCollections.collectionDate, startDate));
      conditions.push(lte(wasteCollections.collectionDate, endDate));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .where(whereClause);

    const data = await db
      .select()
      .from(wasteCollections)
      .where(whereClause)
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const cache = getCache();
    const issueData = {
      ...insertIssue,
      status: insertIssue.status || 'open',
      createdAt: new Date(),
    };

    const [issue] = await db
      .insert(issues)
      .values(issueData)
      .returning();

    // Invalidate issues cache
    if (insertIssue.villageId) {
      await cache.delete(cacheKeys.issues(insertIssue.villageId));
      await cache.clear(`issues:${insertIssue.villageId}:*`);
      await cache.delete(cacheKeys.villageDetails(insertIssue.villageId));
    }
    await cache.delete(cacheKeys.adminStats());

    return issue;
  }

  async getIssuesByVillage(villageId: string): Promise<Issue[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.issues(villageId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(issues)
      .where(eq(issues.villageId, villageId))
      .orderBy(desc(issues.createdAt))
      .limit(500); // Safety limit - use paginated method for larger datasets
    
    await cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  async getIssuesByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{ data: Issue[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    let conditions = [eq(issues.villageId, villageId)];
    
    if (options.status && options.status !== 'all') {
      conditions.push(eq(issues.status, options.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(issues)
      .where(whereClause);

    const data = await db
      .select()
      .from(issues)
      .where(whereClause)
      .orderBy(desc(issues.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    const cache = getCache();
    const [issue] = await db
      .update(issues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    
    // Invalidate issues cache
    if (issue?.villageId) {
      await cache.delete(cacheKeys.issues(issue.villageId));
      await cache.clear(`issues:${issue.villageId}:*`);
      await cache.delete(cacheKeys.villageStats(issue.villageId));
      await cache.delete(cacheKeys.villageDetails(issue.villageId));
    }
    await cache.delete(cacheKeys.adminStats());
    
    return issue;
  }

  async createAnnouncement(data: {
    message: string;
    targetAudience: string;
    villageId?: string | null;
    createdBy: string;
    photoUrl?: string | null;
  }) {
    const cache = getCache();
    const [announcement] = await db
      .insert(announcements)
      .values(data)
      .returning();
    
    // Invalidate cache
    if (data.villageId) {
      await cache.delete(cacheKeys.announcements(data.villageId));
    } else {
      await cache.delete(cacheKeys.globalAnnouncements());
    }
    
    return announcement;
  }

  async getAnnouncementsByVillage(villageId: string): Promise<Announcement[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.announcements(villageId));
    if (cached) return cached;

    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.villageId, villageId))
      .orderBy(desc(announcements.createdAt));
    
    await cache.set(cacheKeys.announcements(villageId), result, 1800);
    return result;
  }

  async getGlobalAnnouncements(): Promise<Announcement[]> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.globalAnnouncements());
    if (cached) return cached;

    const result = await db
      .select()
      .from(announcements)
      .where(isNull(announcements.villageId))
      .orderBy(desc(announcements.createdAt));
    
    await cache.set(cacheKeys.globalAnnouncements(), result, 1800);
    return result;
  }

  async getAllAnnouncements() {
    return await db.select({
      id: announcements.id,
      message: announcements.message,
      targetAudience: announcements.targetAudience,
      villageId: announcements.villageId,
      photoUrl: announcements.photoUrl,
      createdAt: announcements.createdAt,
      createdBy: announcements.createdBy,
    })
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(200); // Safety limit
  }

  async getAllAnnouncementsPaginated(options: {
    page?: number;
    limit?: number;
    villageId?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.announcementsPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.villageId) return cached;

    let whereClause = undefined;
    if (options.villageId) {
      whereClause = eq(announcements.villageId, options.villageId);
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(announcements)
      .where(whereClause);

    const data = await db.select({
      id: announcements.id,
      message: announcements.message,
      targetAudience: announcements.targetAudience,
      villageId: announcements.villageId,
      photoUrl: announcements.photoUrl,
      createdAt: announcements.createdAt,
      createdBy: announcements.createdBy,
    })
    .from(announcements)
    .where(whereClause)
    .orderBy(desc(announcements.createdAt))
    .limit(limit)
    .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.villageId) {
      await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
  }

  async updateAnnouncement(id: string, data: {
    message: string;
    targetAudience: string;
    photoUrl?: string | null;
    updatedBy: string;
  }) {
    const [updated] = await db.update(announcements)
      .set({
        message: data.message,
        targetAudience: data.targetAudience,
        photoUrl: data.photoUrl,
      })
      .where(eq(announcements.id, id))
      .returning();

    return updated;
  }

  async deleteAnnouncement(id: string, deletedBy: string) {
    const [deleted] = await db.delete(announcements)
      .where(eq(announcements.id, id))
      .returning();

    return deleted;
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const [feedbackRecord] = await db
      .insert(feedback)
      .values(insertFeedback)
      .returning();
    return feedbackRecord;
  }

  async getFeedbackByCollector(collectorId: number): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.toCollectorId, collectorId))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByHouseholdAndCollector(householdId: number, collectorId: number): Promise<Feedback | undefined> {
    const [feedbackRecord] = await db
      .select()
      .from(feedback)
      .where(and(eq(feedback.fromHouseholdId, householdId), eq(feedback.toCollectorId, collectorId)))
      .limit(1);
    return feedbackRecord || undefined;
  }

  async getCollectionById(collectionId: number): Promise<any> {
    const [collection] = await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.id, collectionId))
      .limit(1);
    return collection;
  }

  async getFeedbackByVillage(villageId: string): Promise<any[]> {
    return await db
      .select({
        id: feedback.id,
        fromHouseholdId: feedback.fromHouseholdId,
        toCollectorId: feedback.toCollectorId,
        rating: feedback.rating,
        remarks: feedback.remarks,
        createdAt: feedback.createdAt,
        householdUid: households.uid,
        headName: households.headName,
        collectorName: collectors.name,
      })
      .from(feedback)
      .innerJoin(households, eq(feedback.fromHouseholdId, households.id))
      .innerJoin(collectors, eq(feedback.toCollectorId, collectors.id))
      .where(eq(households.villageId, villageId))
      .orderBy(desc(feedback.createdAt));
  }

  async getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]> {
    let conditions = [eq(households.villageId, villageId)];

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(sql`${wasteCollections.collectionDate} >= ${startDate}`);
      conditions.push(sql`${wasteCollections.collectionDate} <= ${endDate}`);
    }

    if (householdId) {
      conditions.push(eq(wasteCollections.householdId, householdId));
    }

    return await db
      .select({
        id: wasteCollections.id,
        collectionDate: wasteCollections.collectionDate,
        segregationRating: wasteCollections.segregationRating,
        plasticRating: wasteCollections.plasticRating,
        observations: wasteCollections.observations,
        remarks: wasteCollections.remarks,
        photoUrl: wasteCollections.photoUrl,
        voiceUrl: wasteCollections.voiceUrl,
        status: wasteCollections.status,
        missedReason: wasteCollections.missedReason,
        householdId: wasteCollections.householdId,
        householdUid: households.uid,
        headName: households.headName,
        houseNumber: households.houseNumber,
        collectorId: wasteCollections.collectorId,
        collectorName: collectors.name,
        collectorUid: collectors.uid,
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
      .where(and(...conditions))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(500);
  }

  async getCollectionsByVillageWithDetailsPaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    date?: string;
    collectorId?: number;
    status?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    let conditions = [eq(households.villageId, villageId)];

    if (options.date) {
      const startDate = new Date(options.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(options.date);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(sql`${wasteCollections.collectionDate} >= ${startDate}`);
      conditions.push(sql`${wasteCollections.collectionDate} <= ${endDate}`);
    }

    if (options.collectorId) {
      conditions.push(eq(wasteCollections.collectorId, options.collectorId));
    }

    if (options.status && options.status !== 'all') {
      conditions.push(eq(wasteCollections.status, options.status));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(whereClause);

    const data = await db
      .select({
        id: wasteCollections.id,
        collectionDate: wasteCollections.collectionDate,
        segregationRating: wasteCollections.segregationRating,
        plasticRating: wasteCollections.plasticRating,
        observations: wasteCollections.observations,
        remarks: wasteCollections.remarks,
        photoUrl: wasteCollections.photoUrl,
        voiceUrl: wasteCollections.voiceUrl,
        status: wasteCollections.status,
        missedReason: wasteCollections.missedReason,
        householdId: wasteCollections.householdId,
        householdUid: households.uid,
        headName: households.headName,
        houseNumber: households.houseNumber,
        collectorId: wasteCollections.collectorId,
        collectorName: collectors.name,
        collectorUid: collectors.uid,
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
      .where(whereClause)
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }

  async getFeedbackByVillageWithFilters(villageId: string, date?: string): Promise<any[]> {
    let baseConditions = [eq(households.villageId, villageId)];

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      baseConditions.push(
        sql`${feedback.createdAt} >= ${startDate}`,
        sql`${feedback.createdAt} <= ${endDate}`
      );
    }

    return await db
      .select({
        id: feedback.id,
        fromHouseholdId: feedback.fromHouseholdId,
        toCollectorId: feedback.toCollectorId,
        rating: feedback.rating,
        remarks: feedback.remarks,
        createdAt: feedback.createdAt,
        householdUid: households.uid,
        headName: households.headName,
        houseNumber: households.houseNumber,
        collectorName: collectors.name,
        collectorUid: collectors.uid,
      })
      .from(feedback)
      .innerJoin(households, eq(feedback.fromHouseholdId, households.id))
      .innerJoin(collectors, eq(feedback.toCollectorId, collectors.id))
      .where(baseConditions.length > 1 ? and(...baseConditions) : baseConditions[0])
      .orderBy(desc(feedback.createdAt));
  }

  async getVillageStats(villageId: string): Promise<{
    totalHouseholds: number;
    totalCollectors: number;
    openIssues: number;
    collectionsToday: number;
  }> {
    const cache = getCache();
    const cached = await cache.get(cacheKeys.villageStats(villageId));
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [householdsCount] = await db
      .select({ count: count() })
      .from(households)
      .where(eq(households.villageId, villageId));

    const [collectorsCount] = await db
      .select({ count: count() })
      .from(collectors)
      .where(eq(collectors.villageId, villageId));

    const [openIssuesCount] = await db
      .select({ count: count() })
      .from(issues)
      .where(and(eq(issues.villageId, villageId), eq(issues.status, "open")));

    const [collectionsToday] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          eq(households.villageId, villageId),
          sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
        )
      );

    const stats = {
      totalHouseholds: householdsCount.count,
      totalCollectors: collectorsCount.count,
      openIssues: openIssuesCount.count,
      collectionsToday: collectionsToday.count,
    };

    await cache.set(cacheKeys.villageStats(villageId), stats, 300); // 5 min TTL for stats
    return stats;
  }

  async getAdminStats(): Promise<{
    totalVillages: number;
    totalManagers: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [villagesCount] = await db
      .select({ count: count() })
      .from(villages);

    const [managersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "manager"));

    const [openIssuesCount] = await db
      .select({ count: count() })
      .from(issues)
      .where(eq(issues.status, "open"));

    const [collectionsToday] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .where(
        sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
      );

    return {
      totalVillages: villagesCount.count,
      totalManagers: managersCount.count,
      totalOpenIssues: openIssuesCount.count,
      totalCollectionsToday: collectionsToday.count,
    };
  }

  async getManagersList(): Promise<User[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.managers();
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db.select()
      .from(users)
      .where(eq(users.role, 'manager'))
      .limit(500); // Safety limit
    
    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  async getManagersListPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    villageId?: string;
  } = {}): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.managersPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search && !options.villageId) return cached;

    let conditions = [eq(users.role, 'manager')];

    if (options.villageId) {
      conditions.push(eq(users.villageId, options.villageId));
    }

    if (options.search) {
      conditions.push(
        or(
          like(users.name, `%${options.search}%`),
          like(users.userId, `%${options.search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const data = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(users.userId)
      .limit(limit)
      .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search && !options.villageId) {
      await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
  }

  async getModeratorsUser(): Promise<User[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.moderators();
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await db.select()
      .from(users)
      .where(eq(users.role, 'moderator'))
      .limit(500); // Safety limit
    
    await cache.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  async getModeratorsListPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ data: User[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;

    const cacheKey = cacheKeys.moderatorsPaginated(page, limit);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search) return cached;

    let conditions = [eq(users.role, 'moderator')];

    if (options.search) {
      conditions.push(
        or(
          like(users.name, `%${options.search}%`),
          like(users.userId, `%${options.search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const data = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(users.userId)
      .limit(limit)
      .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search) {
      await cache.set(cacheKey, result, 600); // 10 min TTL
    }
    return result;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.userId, userId))
      .returning();
    return user;
  }

  async deleteVillage(villageId: string): Promise<void> {
    // Delete in proper order to avoid foreign key violations

    // 1. Delete waste collections for this village's households
    await db.delete(wasteCollections)
      .where(sql`household_id IN (SELECT id FROM households WHERE village_id = ${villageId})`);

    // 2. Delete feedback and for this village's collectors
    await db.delete(feedback)
      .where(sql`to_collector_id IN (SELECT id FROM collectors WHERE village_id = ${villageId})`);

    await db.delete(moderatorVillageAssignments)
    .where(sql`village_id = ${villageId}`);


    // 3. Delete main tables
    await db.delete(households).where(eq(households.villageId, villageId));
    await db.delete(collectors).where(eq(collectors.villageId, villageId));
    await db.delete(issues).where(eq(issues.villageId, villageId));
    await db.delete(announcements).where(eq(announcements.villageId, villageId));
    await db.delete(users).where(eq(users.villageId, villageId));
    await db.delete(villages).where(eq(villages.villageId, villageId));
  }

  async generateReport(filters: {
    village?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      const cache = getCache();
      const cacheKey = cacheKeys.generateReport(
        filters.village || 'all',
        filters.startDate?.toISOString() || 'all',
        filters.endDate?.toISOString() || 'all'
      );
      
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
      const allVillages = await db.select().from(villages);
      
      let result: any = { collections: [] };

      for (const village of allVillages) {
        // Apply village filter
        if (filters.village && filters.village !== village.villageId) {
          continue;
        }

        const villageStatsPromises = [];
        
        // Get monthly stats from summary table for past months
        if (filters.startDate) {
          const startMonth = filters.startDate.getFullYear() + '-' + String(filters.startDate.getMonth() + 1).padStart(2, '0');
          const endMonth = filters.endDate 
            ? filters.endDate.getFullYear() + '-' + String(filters.endDate.getMonth() + 1).padStart(2, '0')
            : currentMonth;

          // Get stats from monthly_village_stats for all months in range except current
          let statsQuery = db
            .select({
              villageId: monthlyVillageStats.villageId,
              collections: sql<number>`${monthlyVillageStats.collectionsCompleted} + ${monthlyVillageStats.collectionsMissed}`,
              avgSegregationRating: monthlyVillageStats.averageSegregationRating,
              avgPlasticRating: monthlyVillageStats.averagePlasticRating,
            })
            .from(monthlyVillageStats)
            .where(
              and(
                eq(monthlyVillageStats.villageId, village.villageId),
                sql`${monthlyVillageStats.month} >= ${startMonth}`,
                sql`${monthlyVillageStats.month} <= ${endMonth}`,
                sql`${monthlyVillageStats.month} != ${currentMonth}` // Exclude current month from summary
              )
            );

          villageStatsPromises.push(statsQuery);
        }

        // Get live data for current month (real-time data)
        const monthStart = new Date(currentMonth + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

        let liveQuery = db
          .select({
            villageId: households.villageId,
            collections: count(wasteCollections.id),
            avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
            avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
          })
          .from(wasteCollections)
          .innerJoin(households, eq(wasteCollections.householdId, households.id))
          .where(
            and(
              eq(households.villageId, village.villageId),
              gte(wasteCollections.collectionDate, monthStart),
              lte(wasteCollections.collectionDate, monthEnd)
            )
          )
          .groupBy(households.villageId);

        villageStatsPromises.push(liveQuery);
      }

      // Combine results from all queries
      const allStats = await Promise.all(villageStatsPromises);
      const collectionsByVillage: { [key: string]: any } = {};

      for (const statsArray of allStats) {
        for (const stat of statsArray) {
          const villageId = stat.villageId;
          if (!collectionsByVillage[villageId]) {
            const village = allVillages.find(v => v.villageId === villageId);
            collectionsByVillage[villageId] = {
              villageId,
              villageName: village?.name || 'Unknown',
              collections: 0,
              avgSegregationRating: 0,
              avgPlasticRating: 0,
            };
          }
          
          // Aggregate stats
          collectionsByVillage[villageId].collections += Number(stat.collections) || 0;
          if (stat.avgSegregationRating) {
            collectionsByVillage[villageId].avgSegregationRating = Number(stat.avgSegregationRating) || 0;
          }
          if (stat.avgPlasticRating) {
            collectionsByVillage[villageId].avgPlasticRating = Number(stat.avgPlasticRating) || 0;
          }
        }
      }

      result.collections = Object.values(collectionsByVillage).map(item => ({
        ...item,
        avgSegregationRating: parseFloat((Number(item.avgSegregationRating) || 0).toFixed(2)),
        avgPlasticRating: parseFloat((Number(item.avgPlasticRating) || 0).toFixed(2)),
        collections: Number(item.collections) || 0
      }));

      await cache.set(cacheKey, result, 300); // 5 min cache
      return result;
    } catch (error) {
      console.error("Generate report error:", error);
      return { collections: [] };
    }
  }

  async getVillageDetails(villageId: string): Promise<any> {
    const cache = getCache();
    const cacheKey = cacheKeys.villageDetails(villageId);
    
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Run all queries in parallel for better performance
    const [
      village,
      stats,
      managers,
      householdsResult,
      collectorsResult,
      issuesResult,
    ] = await Promise.all([
      this.getVillageByVillageId(villageId),
      this.getVillageStats(villageId),
      db.select().from(users)
        .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')))
        .limit(50), // Bounded
      this.getHouseholdsByVillagePaginated(villageId, { page: 1, limit: 50 }),
      this.getCollectorsByVillagePaginated(villageId, { page: 1, limit: 50 }),
      this.getIssuesByVillagePaginated(villageId, { page: 1, limit: 50 }),
    ]);

    const result = {
      village,
      stats,
      managers,
      households: householdsResult.data,
      householdsTotal: householdsResult.total,
      collectors: collectorsResult.data,
      collectorsTotal: collectorsResult.total,
      issues: issuesResult.data,
      issuesTotal: issuesResult.total,
    };

    await cache.set(cacheKey, result, 300); // 5 min cache
    return result;
  }

  async addManagerToVillage(villageData: {
  villageId: string;
  managerName: string;
  managerPhone: string;
}): Promise<User> {
  const { villageId, managerName, managerPhone } = villageData;

  // Get all existing managers for the village
  const existingManagers = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));

  // Extract and parse manager numbers from user IDs like "V001-M3"
  const usedNumbers = existingManagers
    .map((u) => {
      const match = u.userId.match(/-M(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .sort((a, b) => a - b);

  // Find the smallest unused manager number
  let managerNumber = 1;
  for (const num of usedNumbers) {
    if (num === managerNumber) {
      managerNumber++;
    } else {
      break;
    }
  }

  const managerId = `${villageId}-M${managerNumber}`;
  const hashedPassword = await bcrypt.hash(managerId, 10);

  // Insert new manager
  const [manager] = await db
    .insert(users)
    .values({
      userId: managerId,
      password: hashedPassword,
      role: 'manager',
      name: managerName,
      phone: managerPhone,
      villageId,
    })
    .returning();

  return manager;
}


  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.userId, userId));
  }

  // Enhanced collector operations
  async deleteCollector(id: number): Promise<void> {
    const cache = getCache();
    // Get villageId before deleting
    const [collector] = await db.select({ villageId: collectors.villageId })
      .from(collectors)
      .where(eq(collectors.id, id))
      .limit(1);
    
    await db.delete(collectors).where(eq(collectors.id, id));
    
    // Invalidate collector caches
    if (collector?.villageId) {
      await cache.delete(cacheKeys.collectors(collector.villageId));
      await cache.clear(`collectors:${collector.villageId}:*`);
      await cache.delete(cacheKeys.villageStats(collector.villageId));
      await cache.delete(cacheKeys.villageDetails(collector.villageId));
    }
  }

  async getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    complaintsCount: number;
  }> {
    // Get total collections
    const [collectionCount] = await db.select({ count: count() })
      .from(wasteCollections)
      .where(eq(wasteCollections.collectorId, collectorId));


    const feedbackResults = await db.select()
      .from(feedback)
      .where(eq(feedback.toCollectorId, collectorId));

    const avgRating = feedbackResults.length > 0 
      ? feedbackResults.reduce((sum, f) => sum + f.rating, 0) / feedbackResults.length 
      : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      totalCollections: collectionCount.count || 0,
      averageRating: avgRating,
    };
  }

  // Enhanced household operations


  async markQRCodesPrinted(householdIds: number[]): Promise<void> {
    await db.update(households)
      .set({ qrPrinted: true })
      .where(inArray(households.id, householdIds));
  }

  async deleteHousehold(id: number): Promise<void> {
    const cache = getCache();
    // Get villageId before deleting
    const [household] = await db.select({ villageId: households.villageId })
      .from(households)
      .where(eq(households.id, id))
      .limit(1);
    
    await db.delete(households).where(eq(households.id, id));
    
    // Invalidate household caches
    if (household?.villageId) {
      await cache.delete(cacheKeys.households(household.villageId));
      await cache.clear(`households:${household.villageId}:*`);
      await cache.delete(cacheKeys.villageStats(household.villageId));
      await cache.delete(cacheKeys.villageDetails(household.villageId));
    }
  }

  async getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.generatorUserId, generatorUserId));
    return household || undefined;
  }

  async getRecentCollectionsByVillage(villageId: string, days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return db
      .select({
        collectionDate: sql<string>`DATE(${wasteCollections.collectionDate})`,
        collections: count(wasteCollections.id),
        avgSegregationRating: sql<number>`COALESCE(AVG(${wasteCollections.segregationRating}), 0)`,
        avgPlasticRating: sql<number>`COALESCE(AVG(${wasteCollections.plasticRating}), 0)`,
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          eq(households.villageId, villageId),
          sql`${wasteCollections.collectionDate} >= ${startDate}`
        )
      )
      .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
      .orderBy(sql`DATE(${wasteCollections.collectionDate})`);
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
    const cache = getCache();
    const dateKey = date || new Date().toISOString().split('T')[0];
    const villageKey = villageId || 'all';
    const cacheKey = cacheKeys.dailyReport(villageKey, dateKey);
    
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const villageCondition = villageId && villageId !== 'all' 
      ? eq(households.villageId, villageId) 
      : sql`1=1`;
    
    const dateCondition = sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`;

    const [householdsCount] = await db
      .select({ count: count() })
      .from(households)
      .where(villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`);

    const [collectionsCount] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(and(dateCondition, villageCondition));

    // Average rating for the day
    const [avgRating] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
          villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
        )
      );

    // Rating distribution
    const ratingDistribution = await db
      .select({
        rating: wasteCollections.segregationRating,
        count: count(),
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
          villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`,
          sql`${wasteCollections.segregationRating} IS NOT NULL`
        )
      )
      .groupBy(wasteCollections.segregationRating)
      .orderBy(wasteCollections.segregationRating);

    // Collection timeline (hourly breakdown)
    const timeline = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`,
        collections: count(),
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
          villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`);

    // Composting data (assuming we have waste segregation data)
    const compostingStats = await db
      .select({
        composting: count(sql`CASE WHEN ${wasteCollections.segregationRating} >= 4 THEN 1 END`),
        notComposting: count(sql`CASE WHEN ${wasteCollections.segregationRating} < 4 OR ${wasteCollections.segregationRating} IS NULL THEN 1 END`),
        total: count()
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
          villageId && villageId !== 'all' ? eq(households.villageId, villageId) : sql`1=1`
        )      );

    // Village/Collector performance
    let performanceQuery;
    if (villageId && villageId !== 'all') {
      // Show collector performance for specific village
      performanceQuery = db
        .select({
          name: collectors.name,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
        .where(
          and(
            eq(households.villageId, villageId),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        )
        .groupBy(collectors.id, collectors.name)
        .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);
    } else {
      // Show village performance
      performanceQuery = db
        .select({
          name: villages.name,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(
          sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
        )
        .groupBy(villages.villageId, villages.name)
        .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);
    }

    const performance = await performanceQuery;

    // Safely convert avgRating to number
    const dailyAvgRating = Number(avgRating.avg) || 0;

    const result = {
      totalHouses: householdsCount.count,
      collected: collectionsCount.count,
      remaining: householdsCount.count - collectionsCount.count,
      avgSegregationRating: parseFloat(dailyAvgRating.toFixed(2)),
      ratingDistribution,
      collectionTimeline: timeline,
      villagePerformance: performance.map(p => ({
        ...p,
        avgRating: parseFloat((Number(p.avgRating) || 0).toFixed(2))
      })),
      compostingData: compostingStats[0] || { composting: 0, notComposting: 0, total: 0 },
    };

    await cache.set(cacheKey, result, 300);
    return result;
  }

  // Moderator operations
  async createModerator(insertModerator: InsertModerator): Promise<Moderator> {
    const [moderator] = await db
      .insert(moderators)
      .values(insertModerator)
      .returning();

    // Create user account for moderator
    const hashedPassword = await bcrypt.hash(insertModerator.moderatorId, 10);
    await db
      .insert(users)
      .values({
        userId: insertModerator.moderatorId,
        password: hashedPassword,
        role: 'moderator',
        name: insertModerator.name,
        phone: insertModerator.phone,
        villageId: null,
      });

    return moderator;
  }

  async getModeratorsList(): Promise<Moderator[]> {
    return await db.select().from(moderators);
  }

  async updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator> {
    const [moderator] = await db
      .update(moderators)
      .set(updates)
      .where(eq(moderators.moderatorId, moderatorId))
      .returning();
    return moderator;
  }

  async deleteModerator(moderatorId: string): Promise<void> {
    // Delete moderator village assignments first
    await db.delete(moderatorVillageAssignments).where(eq(moderatorVillageAssignments.moderatorId, moderatorId));

    // Delete user account
    await db.delete(users).where(eq(users.userId, moderatorId));

    // Delete moderator
    await db.delete(moderators).where(eq(moderators.moderatorId, moderatorId));
  }

  async assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment> {
    const [villageAssignment] = await db
      .insert(moderatorVillageAssignments)
      .values(assignment)
      .returning();
    return villageAssignment;
  }

  async removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void> {
    await db.delete(moderatorVillageAssignments).where(
      and(
        eq(moderatorVillageAssignments.moderatorId, moderatorId),
        eq(moderatorVillageAssignments.villageId, villageId)
      )
    );
  }

  async getModeratorVillages(moderatorId: string): Promise<any[]> {
    return await db
      .select({
        villageId: villages.villageId,
        name: villages.name,
        assignedAt: moderatorVillageAssignments.assignedAt,
      })
      .from(moderatorVillageAssignments)
      .innerJoin(villages, eq(moderatorVillageAssignments.villageId, villages.villageId))
      .where(eq(moderatorVillageAssignments.moderatorId, moderatorId));
  }

  async getIssueById(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue || undefined;
  }

  async getManagersByVillage(villageId: string): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));
  }

  async getModeratorStats(villageIds: string[]): Promise<{
    totalVillages: number;
    totalHouseholds: number;
    totalCollectors: number;
    totalOpenIssues: number;
    totalCollectionsToday: number;
  }> {
    if (villageIds.length === 0) {
      return {
        totalVillages: 0,
        totalHouseholds: 0,
        totalCollectors: 0,
        totalOpenIssues: 0,
        totalCollectionsToday: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [householdsCount] = await db
      .select({ count: count() })
      .from(households)
      .where(inArray(households.villageId, villageIds));

    const [collectorsCount] = await db
      .select({ count: count() })
      .from(collectors)
      .where(inArray(collectors.villageId, villageIds));

    const [openIssuesCount] = await db
      .select({ count: count() })
      .from(issues)
      .where(and(
        inArray(issues.villageId, villageIds),
        eq(issues.status, "open")
      ));

    const [collectionsToday] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          inArray(households.villageId, villageIds),
          sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
        )
      );

    return {
      totalVillages: villageIds.length,
      totalHouseholds: householdsCount.count,
      totalCollectors: collectorsCount.count,
      totalOpenIssues: openIssuesCount.count,
      totalCollectionsToday: collectionsToday.count,
    };
  }

  async getModeratorReports(villageIds: string[], filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    if (villageIds.length === 0) {
      return { collections: [] };
    }

    try {
      let collectionsQuery = db
        .select({
          villageId: households.villageId,
          villageName: villages.name,
          collections: count(wasteCollections.id),
          avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
          avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(inArray(households.villageId, villageIds))
        .groupBy(households.villageId, villages.name);

      if (filters.startDate) {
        collectionsQuery = collectionsQuery.where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${filters.startDate}`
          )
        );
      }
      if (filters.endDate) {
        collectionsQuery = collectionsQuery.where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} <= ${filters.endDate}`
          )
        );
      }

      const collectionsData = await collectionsQuery;

      const formattedCollections = collectionsData.map(item => ({
        ...item,
        avgSegregationRating: parseFloat((Number(item.avgSegregationRating) || 0).toFixed(2)),
        avgPlasticRating: parseFloat((Number(item.avgPlasticRating) || 0).toFixed(2)),
        collections: Number(item.collections) || 0
      }));

      return {
        collections: formattedCollections,
      };
    } catch (error) {
      console.error("Generate moderator report error:", error);
      return { collections: [] };
    }
  }

  async getModeratorIssues(villageIds: string[]): Promise<Issue[]> {
    if (villageIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(issues)
      .where(inArray(issues.villageId, villageIds))
      .orderBy(desc(issues.createdAt));
  }

  async getModeratorCollectors(villageIds: string[]): Promise<any[]> {
    if (villageIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: collectors.id,
        uid: collectors.uid,
        name: collectors.name,
        phone: collectors.phone,
        villageId: collectors.villageId,
        villageName: villages.name,
      })
      .from(collectors)
      .innerJoin(villages, eq(collectors.villageId, villages.villageId))
      .where(inArray(collectors.villageId, villageIds))
      .orderBy(collectors.uid);
  }

  async getModeratorHouseholds(villageIds: string[]): Promise<any[]> {
    if (villageIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: households.id,
        uid: households.uid,
        headName: households.headName,
        phone: households.phone,
        houseNumber: households.houseNumber,
        villageId: households.villageId,
        villageName: villages.name,
      })
      .from(households)
      .innerJoin(villages, eq(households.villageId, villages.villageId))
      .where(inArray(households.villageId, villageIds))
      .orderBy(households.uid);
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
    // Filter villageIds based on selectedVillageId if provided
    const targetVillageIds = selectedVillageId && selectedVillageId !== 'all' 
      ? [selectedVillageId].filter(id => villageIds.includes(id))
      : villageIds;

    if (targetVillageIds.length === 0) {
      // Return default structure with empty data but valid 7-day trends
      const emptyCollectionTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        emptyCollectionTrends.push({
          date: dateStr,
          collectionDate: dateStr,
          collections: 0,
          totalHouseholds: 0,
          avgRating: 0
        });
      }

      return {
        totalCollections: 0,
        avgRating: 0,
        villageStats: [],
        totalCollectionsThisWeek: 0,
        averageSegregationRating: 0,
        topPerformingVillages: [],
        collectionTrends: emptyCollectionTrends,
        segregationRateDistribution: [],
        totalVillages: 0,
        totalHouseholds: 0,
        totalCollectors: 0,
        totalCollectionsToday: 0,
      };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Basic counts
      const [collectionsCount] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(inArray(households.villageId, targetVillageIds));

      const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(inArray(households.villageId, targetVillageIds));

      const [collectorsCount] = await db
        .select({ count: count() })
        .from(collectors)
        .where(inArray(collectors.villageId, targetVillageIds));

      const [collectionsToday] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, targetVillageIds),
            sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`
          )
        );

      const [collectionsThisWeek] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, targetVillageIds),
            sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`
          )
        );

      const [avgRating] = await db.select({
          avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(and(
          inArray(households.villageId, targetVillageIds),
          sql`${wasteCollections.segregationRating} IS NOT NULL`
        ));

      // Collection trends (last 7 days) - Get actual data with total households context
      const collectionTrendsData = await db.select({
          date: sql<string>`DATE(${wasteCollections.collectionDate})`,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, targetVillageIds),
            sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`
          )
        )
        .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
        .orderBy(sql`DATE(${wasteCollections.collectionDate})`);

      // Create complete 7-day collection trends with all dates and total households context
      const totalHouseholdsForTrends = Number(householdsCount?.count) || 0;
      const collectionTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayData = collectionTrendsData.find(trend => trend.date === dateStr);
        collectionTrends.push({
          date: dateStr,
          collectionDate: dateStr,
          collections: Number(dayData?.collections) || 0,
          totalHouseholds: totalHouseholdsForTrends,
          avgRating: parseFloat((Number(dayData?.avgRating) || 0).toFixed(2))
        });
      }

      // Segregation rate distribution
      const segregationRateDistributionData = await db.select({
          rating: wasteCollections.segregationRating,
          count: count()
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, targetVillageIds),
            sql`${wasteCollections.segregationRating} IS NOT NULL`
          )
        )
        .groupBy(wasteCollections.segregationRating)
        .orderBy(wasteCollections.segregationRating);

      // Top performing villages
      const villageStats = await db.select({
          villageId: households.villageId,
          villageName: villages.name,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(inArray(households.villageId, targetVillageIds))
        .groupBy(households.villageId, villages.name)
        .orderBy(desc(sql`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`));

      const avgRatingValue = Number(avgRating?.avg) || 0;

      return {
        totalCollections: Number(collectionsCount?.count) || 0,
        avgRating: parseFloat(avgRatingValue.toFixed(2)),
        villageStats: villageStats.map(stat => ({
          ...stat,
          avgRating: parseFloat((Number(stat.avgRating) || 0).toFixed(2)),
          collections: Number(stat.collections) || 0
        })),
        totalCollectionsThisWeek: Number(collectionsThisWeek?.count) || 0,
        averageSegregationRating: parseFloat(avgRatingValue.toFixed(2)),
        topPerformingVillages: villageStats.slice(0, 5).map(stat => ({
          ...stat,
          avgRating: parseFloat((Number(stat.avgRating) || 0).toFixed(2)),
          collections: Number(stat.collections) || 0
        })),
        collectionTrends,
        segregationRateDistribution: segregationRateDistributionData.map(item => ({
          rating: Number(item.rating) || 0,
          count: Number(item.count) || 0
        })),
        totalVillages: targetVillageIds.length,
        totalHouseholds: totalHouseholdsForTrends,
        totalCollectors: Number(collectorsCount?.count) || 0,
        totalCollectionsToday: Number(collectionsToday?.count) || 0,
      };
    } catch (error) {
      console.error("Get moderator system analytics error:", error);

      // Return default structure with empty 7-day trends on error
      const emptyCollectionTrends = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        emptyCollectionTrends.push({
          date: dateStr,
          collectionDate: dateStr,
          collections: 0,
          totalHouseholds: 0,
          avgRating: 0
        });
      }

      return {
        totalCollections: 0,
        avgRating: 0,
        villageStats: [],
        totalCollectionsThisWeek: 0,
        averageSegregationRating: 0,
        topPerformingVillages: [],
        collectionTrends: emptyCollectionTrends,
        segregationRateDistribution: [],
        totalVillages: 0,
        totalHouseholds: 0,
        totalCollectors: 0,
        totalCollectionsToday: 0,
      };
    }
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
    if (villageIds.length === 0) {
      return {
        totalHouses: 0,
        collected: 0,
        remaining: 0,
        avgSegregationRating: 0,
        ratingDistribution: [],
        collectionTimeline: [],
        villagePerformance: [],
        compostingData: { composting: 0, notComposting: 0, total: 0 },
      };
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
      const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(inArray(households.villageId, villageIds));

      const [collectionsCount] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        );

      const [avgRating] = await db
        .select({
          avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        );

      // Rating distribution
      const ratingDistribution = await db
        .select({
          rating: wasteCollections.segregationRating,
          count: count(),
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`,
            sql`${wasteCollections.segregationRating} IS NOT NULL`
          )
        )
        .groupBy(wasteCollections.segregationRating)
        .orderBy(wasteCollections.segregationRating);

      // Collection timeline (hourly breakdown)
      const timeline = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`,
          collections: count(),
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${wasteCollections.collectionDate})`);

      // Village performance for the day
      const villagePerformance = await db
        .select({
          name: villages.name,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        )
        .groupBy(villages.villageId, villages.name)
        .orderBy(sql`COUNT(${wasteCollections.id}) DESC`);

      // Composting data (assuming high segregation rating indicates composting)
      const compostingStats = await db
        .select({
          composting: count(sql`CASE WHEN ${wasteCollections.segregationRating} >= 4 THEN 1 END`),
          notComposting: count(sql`CASE WHEN ${wasteCollections.segregationRating} < 4 OR ${wasteCollections.segregationRating} IS NULL THEN 1 END`),
          total: count()
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            inArray(households.villageId, villageIds),
            sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
          )
        );

      return {
        totalHouses: householdsCount.count,
        collected: collectionsCount.count,
        remaining: householdsCount.count - collectionsCount.count,
        avgSegregationRating: parseFloat((Number(avgRating.avg) || 0).toFixed(2)),
        ratingDistribution,
        collectionTimeline: timeline,
        villagePerformance: villagePerformance.map(p => ({
          ...p,
          avgRating: parseFloat((Number(p.avgRating) || 0).toFixed(2))
        })),
        compostingData: compostingStats[0] || { composting: 0, notComposting: 0, total: 0 },
      };
    } catch (error) {
      console.error("Get moderator daily report data error:", error);
      return {
        totalHouses: 0,
        collected: 0,
        remaining: 0,
        avgSegregationRating: 0,
        ratingDistribution: [],
        collectionTimeline: [],
        villagePerformance: [],
        compostingData: { composting: 0, notComposting: 0, total: 0 },
      };
    }
  }

  // Payment related methods
  async getVillageById(villageId: string): Promise<Village | undefined> {
    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    return village || undefined;
  }

  async updateVillagePaymentLink(villageId: string, paymentLink: string, monthlyFee: string): Promise<Village> {
    const [village] = await db
      .update(villages)
      .set({ 
        paymentLink, 
        monthlyFee,
        updatedAt: new Date()
      })
      .where(eq(villages.villageId, villageId))
      .returning();
    return village;
  }

  async getPaymentsByVillage(villageId: string, month?: string): Promise<any[]> {
    const cache = getCache();
    const cacheKey = cacheKeys.payments(villageId);
    
    // Only cache when no month filter
    if (!month) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    let conditions = [eq(payments.villageId, villageId)];
    if (month) {
      conditions.push(eq(payments.month, month));
    }

    const result = await db
      .select({
        id: payments.id,
        householdId: payments.householdId,
        month: payments.month,
        amount: payments.amount,
        status: payments.status,
        paymentProofUrl: payments.paymentProofUrl,
        submittedAt: payments.submittedAt,
        verifiedAt: payments.verifiedAt,
        verifiedBy: payments.verifiedBy,
        createdAt: payments.createdAt,
        householdUid: households.uid,
        headName: households.headName,
        houseNumber: households.houseNumber,
      })
      .from(payments)
      .innerJoin(households, eq(payments.householdId, households.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(payments.createdAt))
      .limit(500); // Safety limit

    if (!month) {
      await cache.set(cacheKey, result, 300); // 5 min TTL
    }
    return result;
  }

  async getPaymentsByVillagePaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    month?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const cache = getCache();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    
    const cacheKey = cacheKeys.paymentsPaginated(villageId, page, limit, options.month, options.status);
    const cached = await cache.get(cacheKey);
    if (cached && !options.search) return cached;

    let conditions = [eq(payments.villageId, villageId)];
    
    if (options.month) {
      conditions.push(eq(payments.month, options.month));
    }
    
    if (options.status && options.status !== 'all') {
      conditions.push(eq(payments.status, options.status));
    }

    if (options.search) {
      conditions.push(
        or(
          like(households.headName, `%${options.search}%`),
          like(households.uid, `%${options.search}%`),
          like(households.houseNumber, `%${options.search}%`)
        )!
      );
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [countResult] = await db
      .select({ count: count() })
      .from(payments)
      .innerJoin(households, eq(payments.householdId, households.id))
      .where(whereClause);

    const data = await db
      .select({
        id: payments.id,
        householdId: payments.householdId,
        month: payments.month,
        amount: payments.amount,
        status: payments.status,
        paymentProofUrl: payments.paymentProofUrl,
        submittedAt: payments.submittedAt,
        verifiedAt: payments.verifiedAt,
        verifiedBy: payments.verifiedBy,
        createdAt: payments.createdAt,
        householdUid: households.uid,
        headName: households.headName,
        houseNumber: households.houseNumber,
      })
      .from(payments)
      .innerJoin(households, eq(payments.householdId, households.id))
      .where(whereClause)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const result = {
      data,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };

    if (!options.search) {
      await cache.set(cacheKey, result, 300); // 5 min TTL
    }
    return result;
  }

  async getPaymentsByHousehold(householdId: number, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.householdId, householdId))
      .orderBy(desc(payments.createdAt))
      .limit(limit);
  }

    async syncPaymentRecordsForVillage(villageId: string, month: string): Promise<{ created: number, total: number }> {
      // Get village payment info
      const village = await this.getVillageByVillageId(villageId);
      if (!village?.paymentLink || !village?.monthlyFee) {
        throw new Error('Village payment system not configured');
      }

      // Get all households in the village
      const allHouseholds = await db
        .select({ id: households.id })
        .from(households)
        .where(eq(households.villageId, villageId));

      // Get existing payment records for this month
      const existingPayments = await db
        .select({ householdId: payments.householdId })
        .from(payments)
        .where(and(
          eq(payments.villageId, villageId),
          eq(payments.month, month)
        ));

      const existingHouseholdIds = new Set(existingPayments.map(p => p.householdId));

      // Find households without payment records for this month
      const householdsNeedingPayments = allHouseholds.filter(h => !existingHouseholdIds.has(h.id));

      // Create payment records for missing households
      if (householdsNeedingPayments.length > 0) {
        const newPayments = householdsNeedingPayments.map(household => ({
          householdId: household.id,
          villageId,
          month,
          amount: village.monthlyFee,
          status: 'due' as const,
        }));

        await db.insert(payments).values(newPayments);
      }

      return {
        created: householdsNeedingPayments.length,
        total: allHouseholds.length
      };
    }

    async getPaymentByHouseholdAndMonth(householdId: number, month: string): Promise<any | undefined> {      const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.householdId, householdId), eq(payments.month, month)))
      .limit(1);
    return payment || undefined;
  }

  async createPayment(paymentData: any): Promise<any> {
    const [payment] = await db
      .insert(payments)
      .values(paymentData)
      .returning();
    return payment;
  }

  async updatePaymentStatus(paymentId: number, status: string, verifiedBy: string): Promise<any> {
    const [payment] = await db
      .update(payments)
      .set({ 
        status, 
        verifiedBy,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return payment;
  }

  async updatePaymentProof(paymentId: number, paymentProofUrl: string): Promise<any> {
    const [payment] = await db
      .update(payments)
      .set({ 
        paymentProofUrl,
        status: 'verification_pending',
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return payment;
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
    try {
      const cache = getCache();
      const cacheKey = cacheKeys.adminStats() + (villageFilter ? `:${villageFilter}` : '');
      
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Apply village filter where needed
      const villageCondition = villageFilter && villageFilter !== 'all' ? eq(households.villageId, villageFilter) : sql`1=1`;
      const collectorVillageCondition = villageFilter && villageFilter !== 'all' ? eq(collectors.villageId, villageFilter) : sql`1=1`;
      const villageFilterCondition = villageFilter && villageFilter !== 'all' ? eq(villages.villageId, villageFilter) : sql`1=1`;

      const [villagesCount] = await db
        .select({ count: count() })
        .from(villages)
        .where(villageFilterCondition);

      const [householdsCount] = await db
        .select({ count: count() })
        .from(households)
        .where(villageCondition);

      const [collectorsCount] = await db
        .select({ count: count() })
        .from(collectors)
        .where(collectorVillageCondition);

      const [collectionsToday] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            sql`${wasteCollections.collectionDate} >= ${today} AND ${wasteCollections.collectionDate} < ${tomorrow}`,
            villageCondition
          )
        );

      const [collectionsThisWeek] = await db
        .select({ count: count() })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            sql`${wasteCollections.collectionDate} >= ${oneWeekAgo}`,
            villageCondition
          )
        );

      const [avgSegregation] = await db.select({
          avg: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(and(villageCondition, sql`${wasteCollections.segregationRating} IS NOT NULL`));

      // Use monthly stats for top villages historical data combined with current month live data
      const topVillages = await db.select({
          villageName: villages.name,
          avgRating: sql<number>`COALESCE(AVG(CAST(${monthlyVillageStats.averageSegregationRating} AS DECIMAL(3,2))), 0)`,
          collections: sql<number>`SUM(${monthlyVillageStats.collectionsCompleted})`
        })
        .from(monthlyVillageStats)
        .innerJoin(villages, eq(monthlyVillageStats.villageId, villages.villageId))
        .where(villageFilterCondition)
        .groupBy(villages.villageId, villages.name)
        .orderBy(desc(sql`COALESCE(AVG(CAST(${monthlyVillageStats.averageSegregationRating} AS DECIMAL(3,2))), 0)`))
        .limit(5);

      // Get last 7 days trends from live data
      const collectionTrends = await db.select({
          date: sql<string>`DATE(${wasteCollections.collectionDate})`,
          collections: count(wasteCollections.id),
          avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(villageCondition)
        .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
        .orderBy(desc(sql`DATE(${wasteCollections.collectionDate})`))
        .limit(7);

      const segregationDistribution = await db.select({
          rating: wasteCollections.segregationRating,
          count: count()
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .where(
          and(
            sql`${wasteCollections.segregationRating} IS NOT NULL`,
            villageCondition
          )
        )
        .groupBy(wasteCollections.segregationRating)
        .orderBy(wasteCollections.segregationRating);

      // Safely convert avgSegregation to number
      const avgRating = Number(avgSegregation?.avg) || 0;

      const result = {
        totalVillages: Number(villagesCount?.count) || 0,
        totalHouseholds: Number(householdsCount?.count) || 0,
        totalCollectors: Number(collectorsCount?.count) || 0,
        totalCollectionsToday: Number(collectionsToday?.count) || 0,
        totalCollectionsThisWeek: Number(collectionsThisWeek?.count) || 0,
        averageSegregationRating: parseFloat(avgRating.toFixed(2)),
        topPerformingVillages: topVillages.map(v => ({
          ...v, 
          avgRating: parseFloat((Number(v.avgRating) || 0).toFixed(2)),
          collections: Number(v.collections) || 0
        })),
        collectionTrends: collectionTrends.map(t => ({
          ...t,
          avgRating: parseFloat((Number(t.avgRating) || 0).toFixed(2)),
          collections: Number(t.collections) || 0
        })),
        segregationRateDistribution: segregationDistribution.map(s => ({
          rating: Number(s.rating) || 0,
          count: Number(s.count) || 0
        })),
      };

      await cache.set(cacheKey, result, 300); // 5 min cache
      return result;
    } catch (error) {
      console.error("Get system analytics error:", error);
      return {
        totalVillages: 0,
        totalHouseholds: 0,
        totalCollectors: 0,
        totalCollectionsToday: 0,
        totalCollectionsThisWeek: 0,
        averageSegregationRating: 0,
        topPerformingVillages: [],
        collectionTrends: [],
        segregationRateDistribution: [],
      };
    }
  }

  async getRedFlagCount(householdId: number): Promise<number> {
    // Calculate red flag count based on collections - 3+ missed collections or rating < 4
    const householdCollections = await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(10); // Last 10 collections

    const problemCollections = householdCollections.filter(c => 
      (c.segregationRating && c.segregationRating < 4) || 
      (c.status === "not_collected" && c.missedReason && c.missedReason.includes("segregat"))
    ).length;

    return problemCollections;
  }

  // Website feedback operations
  async createWebsiteFeedback(insertFeedback: InsertWebsiteFeedback): Promise<WebsiteFeedback> {
    const [feedback] = await db
      .insert(websiteFeedback)
      .values(insertFeedback)
      .returning();
    return feedback;
  }

  async getWebsiteFeedbacks(): Promise<WebsiteFeedback[]> {
    return await db
      .select()
      .from(websiteFeedback)
      .orderBy(desc(websiteFeedback.createdAt));
  }

  // Contact submissions operations
  async createContactSubmission(insertContact: InsertContactSubmission): Promise<ContactSubmission> {
    const [contact] = await db
      .insert(contactSubmissions)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt));
  }

  // Phase 2: Monthly village stats operations
  async createOrUpdateMonthlyStats(stats: InsertMonthlyVillageStats): Promise<MonthlyVillageStats> {
    // Try to update existing record first
    const [existing] = await db
      .select()
      .from(monthlyVillageStats)
      .where(
        and(
          eq(monthlyVillageStats.villageId, stats.villageId),
          eq(monthlyVillageStats.month, stats.month)
        )
      );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(monthlyVillageStats)
        .set({
          ...stats,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(monthlyVillageStats.villageId, stats.villageId),
            eq(monthlyVillageStats.month, stats.month)
          )
        )
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db
        .insert(monthlyVillageStats)
        .values(stats)
        .returning();
      return created;
    }
  }

  async getMonthlyStatsByVillageAndMonth(villageId: string, month: string): Promise<MonthlyVillageStats | undefined> {
    const [stats] = await db
      .select()
      .from(monthlyVillageStats)
      .where(
        and(
          eq(monthlyVillageStats.villageId, villageId),
          eq(monthlyVillageStats.month, month)
        )
      );
    return stats || undefined;
  }

  async backfillHistoricalStats(): Promise<number> {
    try {
      let recordsCreated = 0;

      // Get all villages
      const allVillages = await db.select().from(villages);

      for (const village of allVillages) {
        // Get unique months from waste_collections
        const monthsResult = await db
          .selectDistinct({
            month: sql<string>`to_char(${wasteCollections.collectionDate}, 'YYYY-MM')`,
          })
          .from(wasteCollections)
          .innerJoin(households, eq(wasteCollections.householdId, households.id))
          .where(eq(households.villageId, village.villageId))
          .orderBy(sql`to_char(${wasteCollections.collectionDate}, 'YYYY-MM')`);

        for (const { month } of monthsResult) {
          if (!month) continue;

          // Calculate stats for this village and month
          const monthStart = new Date(`${month}-01`);
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

          // Get total households in village (at any point during this month)
          const householdsCount = await db
            .select({ count: count() })
            .from(households)
            .where(eq(households.villageId, village.villageId));

          // Get total collectors in village (at any point during this month)
          const collectorsCount = await db
            .select({ count: count() })
            .from(collectors)
            .where(eq(collectors.villageId, village.villageId));

          // Get collections data for this month
          const collectionsData = await db
            .select({
              completed: count(),
              missed: sql<number>`COUNT(*) FILTER (WHERE ${wasteCollections.status} = 'missed')`,
              avgSegregation: avg(wasteCollections.segregationRating),
              avgPlastic: avg(wasteCollections.plasticRating),
            })
            .from(wasteCollections)
            .innerJoin(households, eq(wasteCollections.householdId, households.id))
            .where(
              and(
                eq(households.villageId, village.villageId),
                gte(wasteCollections.collectionDate, monthStart),
                lte(wasteCollections.collectionDate, monthEnd)
              )
            );

          // Get open issues count for this month
          const openIssuesData = await db
            .select({ count: count() })
            .from(issues)
            .where(
              and(
                eq(issues.villageId, village.villageId),
                eq(issues.status, 'open'),
                gte(issues.createdAt, monthStart),
                lte(issues.createdAt, monthEnd)
              )
            );

          // Create or update stats record
          const stats = {
            villageId: village.villageId,
            month,
            totalHouseholds: householdsCount[0]?.count || 0,
            totalCollectors: collectorsCount[0]?.count || 0,
            collectionsCompleted: collectionsData[0]?.completed || 0,
            collectionsMissed: collectionsData[0]?.missed || 0,
            openIssues: openIssuesData[0]?.count || 0,
            averageSegregationRating: collectionsData[0]?.avgSegregation ? Number(collectionsData[0].avgSegregation) : undefined,
            averagePlasticRating: collectionsData[0]?.avgPlastic ? Number(collectionsData[0].avgPlastic) : undefined,
          };

          await this.createOrUpdateMonthlyStats(stats as InsertMonthlyVillageStats);
          recordsCreated++;
        }
      }

      console.log(`✅ Phase 2 backfill completed: ${recordsCreated} monthly stats records created/updated`);
      return recordsCreated;
    } catch (error) {
      console.error('Phase 2 backfill failed:', error);
      throw error;
    }
  }

  // Phase 3: Daily job to update current month stats
  async updateCurrentMonthStats(): Promise<number> {
    try {
      let recordsUpdated = 0;
      const today = new Date();
      const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

      // Get all villages
      const allVillages = await db.select().from(villages);

      for (const village of allVillages) {
        // Calculate current month stats
        const monthStart = new Date(`${currentMonth}-01`);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

        // Get total households
        const householdsCount = await db
          .select({ count: count() })
          .from(households)
          .where(eq(households.villageId, village.villageId));

        // Get total collectors
        const collectorsCount = await db
          .select({ count: count() })
          .from(collectors)
          .where(eq(collectors.villageId, village.villageId));

        // Get collections data for current month
        const collectionsData = await db
          .select({
            completed: count(),
            missed: sql<number>`COUNT(*) FILTER (WHERE ${wasteCollections.status} = 'missed')`,
            avgSegregation: avg(wasteCollections.segregationRating),
            avgPlastic: avg(wasteCollections.plasticRating),
          })
          .from(wasteCollections)
          .innerJoin(households, eq(wasteCollections.householdId, households.id))
          .where(
            and(
              eq(households.villageId, village.villageId),
              gte(wasteCollections.collectionDate, monthStart),
              lte(wasteCollections.collectionDate, monthEnd)
            )
          );

        // Get open issues count
        const openIssuesData = await db
          .select({ count: count() })
          .from(issues)
          .where(
            and(
              eq(issues.villageId, village.villageId),
              eq(issues.status, 'open'),
              gte(issues.createdAt, monthStart),
              lte(issues.createdAt, monthEnd)
            )
          );

        // Update current month stats
        const stats = {
          villageId: village.villageId,
          month: currentMonth,
          totalHouseholds: householdsCount[0]?.count || 0,
          totalCollectors: collectorsCount[0]?.count || 0,
          collectionsCompleted: collectionsData[0]?.completed || 0,
          collectionsMissed: collectionsData[0]?.missed || 0,
          openIssues: openIssuesData[0]?.count || 0,
          averageSegregationRating: collectionsData[0]?.avgSegregation ? Number(collectionsData[0].avgSegregation) : undefined,
          averagePlasticRating: collectionsData[0]?.avgPlastic ? Number(collectionsData[0].avgPlastic) : undefined,
        };

        await this.createOrUpdateMonthlyStats(stats as InsertMonthlyVillageStats);
        recordsUpdated++;
      }

      console.log(`✅ Phase 3: Updated ${recordsUpdated} current month stats records for ${currentMonth}`);
      return recordsUpdated;
    } catch (error) {
      console.error('Phase 3: updateCurrentMonthStats failed:', error);
      throw error;
    }
  }

  // QR Code operations
  async createQRCode(insertQRCode: InsertQRCode): Promise<QRCode> {
    const [qrCode] = await db
      .insert(qrCodes)
      .values(insertQRCode)
      .returning();
    return qrCode;
  }

  async createBatchQRCodes(insertQRCodes: InsertQRCode[]): Promise<QRCode[]> {
    if (insertQRCodes.length === 0) return [];
    const result = await db
      .insert(qrCodes)
      .values(insertQRCodes)
      .returning();
    return result;
  }

  async getQRCodeByUid(uid: string): Promise<QRCode | undefined> {
    const [qrCode] = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.uid, uid));
    return qrCode || undefined;
  }

  async getQRCodesByVillage(villageId: string): Promise<QRCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.villageId, villageId))
      .orderBy(desc(qrCodes.createdAt));
  }

  async getUnmappedQRCodesByVillage(villageId: string): Promise<QRCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.villageId, villageId),
          eq(qrCodes.status, 'notMapped')
        )
      )
      .orderBy(qrCodes.uid);
  }

  async getQRCodesByBatch(batchId: string): Promise<QRCode[]> {
    return await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.batchId, batchId))
      .orderBy(qrCodes.uid);
  }

  async updateQRCodeStatus(uid: string, status: string, householdId?: number): Promise<QRCode> {
    const updateData: Partial<QRCode> = { status };
    if (householdId !== undefined) {
      updateData.householdId = householdId;
    }
    const [qrCode] = await db
      .update(qrCodes)
      .set(updateData)
      .where(eq(qrCodes.uid, uid))
      .returning();
    return qrCode;
  }

  async getNextBatchId(villageId: string): Promise<string> {
    const existingBatches = await db
      .select({ batchId: qrCodes.batchId })
      .from(qrCodes)
      .where(eq(qrCodes.villageId, villageId))
      .groupBy(qrCodes.batchId)
      .orderBy(desc(qrCodes.batchId));

    if (existingBatches.length === 0) {
      return `BATCH-${villageId}-001`;
    }

    const latestBatch = existingBatches[0].batchId;
    const match = latestBatch.match(/BATCH-.*-(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      return `BATCH-${villageId}-${String(nextNum).padStart(3, '0')}`;
    }
    return `BATCH-${villageId}-001`;
  }

  async getMaxHouseNumber(villageId: string): Promise<number> {
    const existingHouseholds = await db
      .select({ uid: households.uid })
      .from(households)
      .where(eq(households.villageId, villageId));

    const existingQRCodes = await db
      .select({ uid: qrCodes.uid })
      .from(qrCodes)
      .where(eq(qrCodes.villageId, villageId));

    let maxNum = 0;

    for (const h of existingHouseholds) {
      const match = h.uid.match(/H(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    for (const qr of existingQRCodes) {
      const match = qr.uid.match(/H(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    return maxNum;
  }

  async getNextQRCodeUid(villageId: string, count: number): Promise<string[]> {
    const maxNum = await this.getMaxHouseNumber(villageId);

    const startNum = maxNum + 1;
    const uids: string[] = [];
    for (let i = 0; i < count; i++) {
      uids.push(`GEN-${villageId}-H${String(startNum + i).padStart(4, '0')}`);
    }
    return uids;
  }

  // Field worker operations
  async getFieldWorkersByVillage(villageId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.villageId, villageId),
          eq(users.role, 'fieldworker')
        )
      )
      .orderBy(users.userId);
  }

  async deleteFieldWorker(userId: string): Promise<void> {
    await db.delete(users).where(
      and(
        eq(users.userId, userId),
        eq(users.role, 'fieldworker')
      )
    );
  }
}

export const storage = new DatabaseStorage();