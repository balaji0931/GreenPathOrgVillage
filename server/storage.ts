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
  moderators,
  moderatorVillageAssignments,

  websiteFeedback,
  contactSubmissions,
  qrCodes,
  dailyWasteLog,
  compostProductionLog,
  dryWasteSales,
  dryWasteSaleMaterials,
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
import { db } from "./db";
import { eq, desc, count, gte, lte, and, or, like, sql, inArray, isNull } from "drizzle-orm";
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



  // QR Code operations (for field worker mapping)
  createQRCode(qrCode: InsertQRCode): Promise<QRCode>;
  createBatchQRCodes(qrCodes: InsertQRCode[]): Promise<QRCode[]>;
  getQRCodeByUid(uid: string): Promise<QRCode | undefined>;
  getQRCodesByVillage(villageId: string): Promise<QRCode[]>;
  getQRCodesByBatch(batchId: string): Promise<QRCode[]>;
  updateQRCodeStatus(uid: string, status: string, householdId?: number): Promise<QRCode>;
  getNextBatchId(villageId: string): Promise<string>;
  getNextQRCodeUid(villageId: string, count: number): Promise<string[]>;

  // Field worker operations
  getFieldWorkersByVillage(villageId: string): Promise<User[]>;
  deleteFieldWorker(userId: string): Promise<void>;

  // Vehicle operations
  addVehicleToVillage(villageId: string, vehicle: { registrationNumber: string; name: string; collectorIds: number[] }): Promise<void>;
  removeVehicleFromVillage(villageId: string, registrationNumber: string): Promise<void>;
  updateVehicleInVillage(villageId: string, registrationNumber: string, updates: { name: string; collectorIds: number[] }): Promise<void>;
  updateCollectorVehicle(collectorId: number, registrationNumber: string | null): Promise<void>;

  // Material & Output Log operations (Manager-only)
  // Daily Waste Log
  createDailyWasteLog(log: InsertDailyWasteLog): Promise<DailyWasteLog>;
  getDailyWasteLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<DailyWasteLog[]>;
  getDailyWasteLogByDate(villageId: string, date: string): Promise<DailyWasteLog | undefined>;
  updateDailyWasteLog(id: number, updates: Partial<DailyWasteLog>): Promise<DailyWasteLog>;
  deleteDailyWasteLog(id: number): Promise<void>;

  // Compost Production Log
  createCompostProductionLog(log: InsertCompostProductionLog): Promise<CompostProductionLog>;
  getCompostProductionLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<CompostProductionLog[]>;
  getCompostProductionLogById(id: number): Promise<CompostProductionLog | undefined>;
  updateCompostProductionLog(id: number, updates: Partial<CompostProductionLog>): Promise<CompostProductionLog>;
  deleteCompostProductionLog(id: number): Promise<void>;

  // Dry Waste Sales
  createDryWasteSale(sale: InsertDryWasteSale, materials: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }>;
  getDryWasteSalesByVillage(villageId: string, startDate?: string, endDate?: string): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] })[]>;
  getDryWasteSaleById(id: number): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] }) | undefined>;
  updateDryWasteSale(id: number, sale: Partial<DryWasteSale>, materials?: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }>;
  deleteDryWasteSale(id: number): Promise<void>;
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
      .values(insertVillage as any)
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
    const limit = Math.min(2000, Math.max(1, options.limit || 2000));
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

  async createWasteCollection(insertCollection: InsertWasteCollection & { latitude?: string, longitude?: string }): Promise<WasteCollection> {
    const cache = getCache();

    // Ensure numeric values for ratings
    const valuesToInsert = {
      ...insertCollection,
      segregationRating: Number(insertCollection.segregationRating),
      plasticRating: Number(insertCollection.plasticRating),
    };
    // Remove latitude/longitude from valuesToInsert as they don't exist in waste_collections table
    const { latitude, longitude, ...dbValues } = valuesToInsert as any;

    const [collection] = await db
      .insert(wasteCollections)
      .values(dbValues)
      .returning();

    // Invalidate collections cache - lookup household to get villageId
    const [household] = await db.select()
      .from(households)
      .where(eq(households.id, insertCollection.householdId))
      .limit(1);

    if (household) {
      // Store location for the first time if not already set
      if (!household.latitude && !household.longitude && latitude && longitude) {
        await db.update(households)
          .set({
            latitude: latitude,
            longitude: longitude
          })
          .where(eq(households.id, household.id));

        // Invalidate household cache
        await cache.delete(cacheKeys.households(household.villageId));
        const patterns = [`households:${household.villageId}:*`];
        for (const pattern of patterns) {
          await cache.clear(pattern);
        }
      }

      if (household.villageId) {
        await cache.delete(cacheKeys.wasteCollections(household.villageId));
        await cache.clear(`collections:${household.villageId}:*`);
        await cache.delete(cacheKeys.villageStats(household.villageId));
        await cache.delete(cacheKeys.adminStats());
      }
    }

    return collection;
  }

  async getCollectionsByHousehold(householdId: number, limit: number = 500): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit);
  }

  async getCollectionsByCollector(collectorId: number, limit: number = 500): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.collectorId, collectorId))
      .orderBy(desc(wasteCollections.collectionDate))
      .limit(limit);
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
      .where(eq(announcements.id, parseInt(id)))
      .returning();

    return updated;
  }

  async deleteAnnouncement(id: string, deletedBy: string) {
    const [deleted] = await db.delete(announcements)
      .where(eq(announcements.id, parseInt(id)))
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
      .orderBy(desc(wasteCollections.collectionDate));
  }

  async getCollectionsByVillageWithDetailsPaginated(villageId: string, options: {
    page?: number;
    limit?: number;
    date?: string;
    collectorId?: number;
    status?: string;
  } = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(10000, Math.max(1, options.limit || 10000));
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

      const villageStatsPromises: any[] = [];

      for (const village of allVillages) {
        // Apply village filter
        if (filters.village && filters.village !== village.villageId) {
          continue;
        }

        // Get monthly stats from summary table for past months
        if (filters.startDate) {
          const startMonth = filters.startDate.getFullYear() + '-' + String(filters.startDate.getMonth() + 1).padStart(2, '0');
          const endMonth = filters.endDate
            ? filters.endDate.getFullYear() + '-' + String(filters.endDate.getMonth() + 1).padStart(2, '0')
            : currentMonth;

          // Get stats from live waste_collections data for all months in range
          let statsQuery = db
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
                gte(wasteCollections.collectionDate, new Date(`${startMonth}-01`)),
                lte(wasteCollections.collectionDate, new Date(`${endMonth}-01`))
              )
            )
            .groupBy(households.villageId);

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
        .limit(1500), // Bounded
      this.getHouseholdsByVillagePaginated(villageId, { page: 1, limit: 1600 }),
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
      complaintsCount: 0,
    };
  }

  // Enhanced household operations

  async deleteHousehold(id: number): Promise<void> {
    const cache = getCache();
    // Get villageId before deleting
    const [household] = await db.select({ villageId: households.villageId })
      .from(households)
      .where(eq(households.id, id))
      .limit(1);

    if (!household) return;

    // Delete related entities manually to ensure consistency
    await db.delete(wasteCollections).where(eq(wasteCollections.householdId, id));
    await db.delete(qrCodes).where(eq(qrCodes.householdId, id));
    await db.delete(feedback).where(eq(feedback.fromHouseholdId, id));
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
        ));

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

      let whereConditions: any[] = [inArray(households.villageId, villageIds)];

      if (filters.startDate) {
        whereConditions.push(sql`${wasteCollections.collectionDate} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        whereConditions.push(sql`${wasteCollections.collectionDate} <= ${filters.endDate}`);
      }

      const collectionsQuery = db
        .select({
          villageId: households.villageId,
          villageName: villages.name,
          collections: sql<number>`COUNT(${wasteCollections.id})`,
          avgSegregationRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.segregationRating}) AS DECIMAL(3,2)), 0)`,
          avgPlasticRating: sql<number>`COALESCE(CAST(AVG(${wasteCollections.plasticRating}) AS DECIMAL(3,2)), 0)`,
        })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(and(...whereConditions))
        .groupBy(households.villageId, villages.name);

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

      // Use live waste_collections data for top villages
      const topVillages = await db.select({
        villageName: villages.name,
        avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`,
        collections: count(wasteCollections.id)
      })
        .from(wasteCollections)
        .innerJoin(households, eq(wasteCollections.householdId, households.id))
        .innerJoin(villages, eq(households.villageId, villages.villageId))
        .where(villageFilterCondition)
        .groupBy(villages.villageId, villages.name)
        .orderBy(desc(sql`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`))
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

  async addVehicleToVillage(villageId: string, vehicle: { registrationNumber: string; name: string; collectorIds: number[] }): Promise<void> {
    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    const existingVehicles = (village.vehicles as any) || [];
    if (existingVehicles.find((v: any) => v.registrationNumber === vehicle.registrationNumber)) {
      throw new Error("Vehicle already exists");
    }

    // Ensure collectors are unassigned from other vehicles first
    if (vehicle.collectorIds && vehicle.collectorIds.length > 0) {
      for (const collectorId of vehicle.collectorIds) {
        await this.updateCollectorVehicle(collectorId, vehicle.registrationNumber);
      }
    }

    const updatedVehicles = [...existingVehicles, vehicle];
    await db.update(villages)
      .set({ vehicles: updatedVehicles })
      .where(eq(villages.villageId, villageId));

    // Clear cache
    const { getCache, cacheKeys } = await import('./cache');
    await getCache().delete(cacheKeys.village(villageId));
    await getCache().delete(cacheKeys.villageDetails(villageId));
  }

  async removeVehicleFromVillage(villageId: string, registrationNumber: string): Promise<void> {
    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    const updatedVehicles = ((village.vehicles as any) || []).filter((v: any) => v.registrationNumber !== registrationNumber);

    await db.update(villages)
      .set({ vehicles: updatedVehicles })
      .where(eq(villages.villageId, villageId));

    // Clear assigned vehicle for collectors
    await db.update(collectors)
      .set({ assignedVehicle: null })
      .where(and(
        eq(collectors.villageId, villageId),
        eq(collectors.assignedVehicle, registrationNumber)
      ));

    // Clear cache
    const { getCache, cacheKeys } = await import('./cache');
    await getCache().delete(cacheKeys.village(villageId));
    await getCache().delete(cacheKeys.villageDetails(villageId));
  }

  async updateVehicleInVillage(villageId: string, registrationNumber: string, updates: { name: string; collectorIds: number[] }): Promise<void> {
    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    if (!village) throw new Error("Village not found");

    let vehicles = (village.vehicles as any[]) || [];
    const vehicleIndex = vehicles.findIndex(v => v.registrationNumber === registrationNumber);
    if (vehicleIndex === -1) throw new Error("Vehicle not found");

    // Unassign collectors that were previously on this vehicle but aren't anymore
    const oldCollectorIds = vehicles[vehicleIndex].collectorIds || [];
    const removedCollectorIds = oldCollectorIds.filter((id: number) => !updates.collectorIds.includes(id));
    for (const id of removedCollectorIds) {
      await this.updateCollectorVehicle(id, null);
    }

    // Assign new collectors (this will handle removing them from other vehicles)
    for (const id of updates.collectorIds) {
      await this.updateCollectorVehicle(id, registrationNumber);
    }

    // Ensure collectors that were previously assigned to this vehicle but are not in the updates
    // are unassigned from this vehicle in the database
    const allVillageCollectors = await db.select().from(collectors).where(and(eq(collectors.villageId, villageId), eq(collectors.assignedVehicle, registrationNumber)));
    for (const c of allVillageCollectors) {
      if (!updates.collectorIds.includes(c.id)) {
        await this.updateCollectorVehicle(c.id, null);
      }
    }

    // Create a new array to ensure update is picked up
    const updatedVehicles = [...vehicles];
    updatedVehicles[vehicleIndex] = { ...updatedVehicles[vehicleIndex], ...updates };

    await db.update(villages).set({ vehicles: updatedVehicles }).where(eq(villages.villageId, villageId));

    // Clear cache
    const { getCache, cacheKeys } = await import('./cache');
    await getCache().delete(cacheKeys.village(villageId));
    await getCache().delete(cacheKeys.villageDetails(villageId));
  }

  async updateCollectorVehicle(collectorId: number, registrationNumber: string | null): Promise<void> {
    const [collector] = await db.select().from(collectors).where(eq(collectors.id, collectorId));
    if (!collector) throw new Error("Collector not found");

    // If assigned to a new vehicle, remove from old vehicle list in village json
    if (registrationNumber && collector.assignedVehicle && collector.assignedVehicle !== registrationNumber) {
      const [village] = await db.select().from(villages).where(eq(villages.villageId, collector.villageId as string));
      if (village) {
        const vehicles = (village.vehicles as any[]) || [];
        const oldVehicle = vehicles.find((v: any) => v.registrationNumber === collector.assignedVehicle);
        if (oldVehicle) {
          oldVehicle.collectorIds = (oldVehicle.collectorIds || []).filter((id: number) => id !== collectorId);
          await db.update(villages).set({ vehicles }).where(eq(villages.villageId, collector.villageId as string));
        }
      }
    }

    await db.update(collectors)
      .set({ assignedVehicle: registrationNumber })
      .where(eq(collectors.id, collectorId));
  }

  // =====================================================
  // MATERIAL & OUTPUT LOG OPERATIONS (Manager-only)
  // =====================================================

  // Daily Waste Log Operations
  async createDailyWasteLog(log: InsertDailyWasteLog): Promise<DailyWasteLog> {
    const [result] = await db
      .insert(dailyWasteLog)
      .values(log)
      .returning();
    return result;
  }

  async getDailyWasteLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<DailyWasteLog[]> {
    let conditions = [eq(dailyWasteLog.villageId, villageId)];

    if (startDate) {
      conditions.push(gte(dailyWasteLog.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(dailyWasteLog.date, endDate));
    }

    return await db
      .select()
      .from(dailyWasteLog)
      .where(and(...conditions))
      .orderBy(desc(dailyWasteLog.date));
  }

  async getDailyWasteLogByDate(villageId: string, date: string): Promise<DailyWasteLog | undefined> {
    const [result] = await db
      .select()
      .from(dailyWasteLog)
      .where(and(
        eq(dailyWasteLog.villageId, villageId),
        eq(dailyWasteLog.date, date)
      ));
    return result || undefined;
  }

  async updateDailyWasteLog(id: number, updates: Partial<DailyWasteLog>): Promise<DailyWasteLog> {
    const [result] = await db
      .update(dailyWasteLog)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyWasteLog.id, id))
      .returning();
    return result;
  }

  async deleteDailyWasteLog(id: number): Promise<void> {
    await db.delete(dailyWasteLog).where(eq(dailyWasteLog.id, id));
  }

  // Compost Production Log Operations
  async createCompostProductionLog(log: InsertCompostProductionLog): Promise<CompostProductionLog> {
    const [result] = await db
      .insert(compostProductionLog)
      .values(log)
      .returning();
    return result;
  }

  async getCompostProductionLogsByVillage(villageId: string, startDate?: string, endDate?: string): Promise<CompostProductionLog[]> {
    let conditions = [eq(compostProductionLog.villageId, villageId)];

    if (startDate) {
      conditions.push(gte(compostProductionLog.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(compostProductionLog.date, endDate));
    }

    return await db
      .select()
      .from(compostProductionLog)
      .where(and(...conditions))
      .orderBy(desc(compostProductionLog.date));
  }

  async getCompostProductionLogById(id: number): Promise<CompostProductionLog | undefined> {
    const [result] = await db
      .select()
      .from(compostProductionLog)
      .where(eq(compostProductionLog.id, id));
    return result || undefined;
  }

  async updateCompostProductionLog(id: number, updates: Partial<CompostProductionLog>): Promise<CompostProductionLog> {
    const [result] = await db
      .update(compostProductionLog)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(compostProductionLog.id, id))
      .returning();
    return result;
  }

  async deleteCompostProductionLog(id: number): Promise<void> {
    await db.delete(compostProductionLog).where(eq(compostProductionLog.id, id));
  }

  // Dry Waste Sales Operations
  async createDryWasteSale(sale: InsertDryWasteSale, materials: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    // Calculate total amount from materials
    const totalAmount = materials.reduce((sum, m) => {
      const amount = parseFloat(m.amount as string) || (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string));
      return sum + amount;
    }, 0);

    const [createdSale] = await db
      .insert(dryWasteSales)
      .values({ ...sale, totalAmount: totalAmount.toFixed(2) })
      .returning();

    // Insert materials with the sale ID
    const materialsToInsert = materials.map(m => ({
      ...m,
      saleId: createdSale.id,
      amount: (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string)).toFixed(2),
    }));

    const createdMaterials = await db
      .insert(dryWasteSaleMaterials)
      .values(materialsToInsert)
      .returning();

    return { ...createdSale, materials: createdMaterials };
  }

  async getDryWasteSalesByVillage(villageId: string, startDate?: string, endDate?: string): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] })[]> {
    let conditions = [eq(dryWasteSales.villageId, villageId)];

    if (startDate) {
      conditions.push(gte(dryWasteSales.saleDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(dryWasteSales.saleDate, endDate));
    }

    const sales = await db
      .select()
      .from(dryWasteSales)
      .where(and(...conditions))
      .orderBy(desc(dryWasteSales.saleDate));

    // Fetch materials for each sale
    const salesWithMaterials = await Promise.all(
      sales.map(async (sale) => {
        const materials = await db
          .select()
          .from(dryWasteSaleMaterials)
          .where(eq(dryWasteSaleMaterials.saleId, sale.id));
        return { ...sale, materials };
      })
    );

    return salesWithMaterials;
  }

  async getDryWasteSaleById(id: number): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] }) | undefined> {
    const [sale] = await db
      .select()
      .from(dryWasteSales)
      .where(eq(dryWasteSales.id, id));

    if (!sale) return undefined;

    const materials = await db
      .select()
      .from(dryWasteSaleMaterials)
      .where(eq(dryWasteSaleMaterials.saleId, id));

    return { ...sale, materials };
  }

  async updateDryWasteSale(id: number, saleUpdates: Partial<DryWasteSale>, materials?: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    let totalAmount = saleUpdates.totalAmount;

    // If materials are provided, recalculate total and replace them
    if (materials && materials.length > 0) {
      totalAmount = materials.reduce((sum, m) => {
        const amount = parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string);
        return sum + amount;
      }, 0).toFixed(2);

      // Delete old materials
      await db.delete(dryWasteSaleMaterials).where(eq(dryWasteSaleMaterials.saleId, id));

      // Insert new materials
      const materialsToInsert = materials.map(m => ({
        ...m,
        saleId: id,
        amount: (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string)).toFixed(2),
      }));

      await db.insert(dryWasteSaleMaterials).values(materialsToInsert);
    }

    const [updatedSale] = await db
      .update(dryWasteSales)
      .set({ ...saleUpdates, totalAmount, updatedAt: new Date() })
      .where(eq(dryWasteSales.id, id))
      .returning();

    const updatedMaterials = await db
      .select()
      .from(dryWasteSaleMaterials)
      .where(eq(dryWasteSaleMaterials.saleId, id));

    return { ...updatedSale, materials: updatedMaterials };
  }

  async deleteDryWasteSale(id: number): Promise<void> {
    // Materials will be deleted by cascade
    await db.delete(dryWasteSales).where(eq(dryWasteSales.id, id));
  }
}

export const storage = new DatabaseStorage();