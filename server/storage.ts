import bcrypt from "bcrypt";
import {
  villages,
  users,
  households,
  collectors,
  wasteCollections,
  issues,
  announcements,
  type Village,
  type User,
  type Household,
  type Collector,
  type WasteCollection,
  type Issue,
  type Announcement,
  type InsertVillage,
  type InsertUser,
  type InsertHousehold,
  type InsertCollector,
  type InsertWasteCollection,
  type InsertIssue,
  type InsertAnnouncement,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, avg, sum, gte, lte, isNotNull, and, or, like, asc, sql, lt, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserByUserId(userId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, password: string): Promise<void>;

  // Village operations
  createVillage(village: InsertVillage): Promise<Village>;
  getVillages(): Promise<Village[]>;
  getVillageByVillageId(villageId: string): Promise<Village | undefined>;

  // Household operations
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHouseholdsByVillage(villageId: string): Promise<Household[]>;
  getHouseholdByUid(uid: string): Promise<Household | undefined>;
  updateHousehold(id: number, updates: Partial<Household>): Promise<Household>;
  getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined>;

  // Collector operations
  createCollector(collector: InsertCollector): Promise<Collector>;
  getCollectorsByVillage(villageId: string): Promise<Collector[]>;
  getCollectorByUid(uid: string): Promise<Collector | undefined>;

  // Waste collection operations
  createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection>;
  getCollectionsByHousehold(householdId: number): Promise<WasteCollection[]>;
  getCollectionsByCollector(collectorId: number): Promise<WasteCollection[]>;
  getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]>;

  // Issue operations
  createIssue(issue: InsertIssue): Promise<Issue>;
  getIssuesByVillage(villageId: string): Promise<Issue[]>;
  updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;

  // Announcement operations
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncementsByVillage(villageId: string): Promise<Announcement[]>;
  getGlobalAnnouncements(): Promise<Announcement[]>;

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
  getVillageDetails(villageId: string): Promise<any>;
  addManagerToVillage(villageData: { villageId: string; managerName: string; managerPhone: string }): Promise<User>;
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
    const [village] = await db
      .insert(villages)
      .values(insertVillage)
      .returning();
    return village;
  }

  async getVillages(): Promise<Village[]> {
    return await db.select().from(villages).orderBy(villages.villageId);
  }

  async getVillageByVillageId(villageId: string): Promise<Village | undefined> {
    const [village] = await db.select().from(villages).where(eq(villages.villageId, villageId));
    return village || undefined;
  }

  async createHousehold(insertHousehold: InsertHousehold): Promise<Household> {
    const [household] = await db
      .insert(households)
      .values(insertHousehold)
      .returning();
    return household;
  }

  async getHouseholdsByVillage(villageId: string): Promise<Household[]> {
    return await db
      .select()
      .from(households)
      .where(eq(households.villageId, villageId))
      .orderBy(households.uid);
  }

  async getHouseholdByUid(uid: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.uid, uid));
    return household || undefined;
  }

  async getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.generatorUserId, generatorUserId));
    return household || undefined;
  }

  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household> {
    const [household] = await db
      .update(households)
      .set(updates)
      .where(eq(households.id, id))
      .returning();
    return household;
  }

  async createCollector(insertCollector: InsertCollector): Promise<Collector> {
    const [collector] = await db
      .insert(collectors)
      .values(insertCollector)
      .returning();
    return collector;
  }

  async getCollectorsByVillage(villageId: string): Promise<Collector[]> {
    return await db
      .select()
      .from(collectors)
      .where(eq(collectors.villageId, villageId))
      .orderBy(collectors.uid);
  }

  async getCollectorByUid(uid: string): Promise<Collector | undefined> {
    const [collector] = await db.select().from(collectors).where(eq(collectors.uid, uid));
    return collector || undefined;
  }

  async createWasteCollection(insertCollection: InsertWasteCollection): Promise<WasteCollection> {
    const [collection] = await db
      .insert(wasteCollections)
      .values(insertCollection as any)
      .returning();
    return collection;
  }

  async getCollectionsByHousehold(householdId: number): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.householdId, householdId))
      .orderBy(desc(wasteCollections.collectionDate));
  }

  async getCollectionsByCollector(collectorId: number): Promise<WasteCollection[]> {
    return await db
      .select()
      .from(wasteCollections)
      .where(eq(wasteCollections.collectorId, collectorId))
      .orderBy(desc(wasteCollections.collectionDate));
  }

  async getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]> {
    let query = db
      .select({
        id: wasteCollections.id,
        householdId: wasteCollections.householdId,
        collectorId: wasteCollections.collectorId,
        collectionDate: wasteCollections.collectionDate,
        segregationRating: wasteCollections.segregationRating,
        plasticRating: wasteCollections.plasticRating,
        observations: wasteCollections.observations,
        remarks: wasteCollections.remarks,
        photoUrl: wasteCollections.photoUrl,
        voiceUrl: wasteCollections.voiceUrl,
        status: wasteCollections.status,
        missedReason: wasteCollections.missedReason,
        householdUid: households.uid,
        householdHeadName: households.headName,
        householdHouseNumber: households.houseNumber,
        collectorUid: collectors.uid,
        collectorName: collectors.name,
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .innerJoin(collectors, eq(wasteCollections.collectorId, collectors.id))
      .where(eq(households.villageId, villageId));

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          eq(households.villageId, villageId),
          gte(wasteCollections.collectionDate, startOfDay),
          lte(wasteCollections.collectionDate, endOfDay)
        )
      );
    }

    if (householdId) {
      query = query.where(
        and(
          eq(households.villageId, villageId),
          eq(wasteCollections.householdId, householdId)
        )
      );
    }

    return await query.orderBy(desc(wasteCollections.collectionDate));
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const issueData = {
      ...insertIssue,
      status: insertIssue.status || 'open',
      createdAt: new Date(),
    };

    const [issue] = await db
      .insert(issues)
      .values(issueData)
      .returning();

    return issue;
  }

  async getIssuesByVillage(villageId: string): Promise<Issue[]> {
    return await db
      .select()
      .from(issues)
      .where(eq(issues.villageId, villageId))
      .orderBy(desc(issues.createdAt));
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    const [issue] = await db
      .update(issues)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async createAnnouncement(data: {
    message: string;
    targetAudience: string;
    villageId?: string | null;
    createdBy: string;
    photoUrl?: string | null;
  }) {
    const [announcement] = await db
      .insert(announcements)
      .values(data)
      .returning();
    return announcement;
  }

  async getAnnouncementsByVillage(villageId: string): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.villageId, villageId))
      .orderBy(desc(announcements.createdAt));
  }

  async getGlobalAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(sql`${announcements.villageId} IS NULL`)
      .orderBy(desc(announcements.createdAt));
  }

  async getVillageStats(villageId: string): Promise<{
    totalHouseholds: number;
    totalCollectors: number;
    openIssues: number;
    collectionsToday: number;
  }> {
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
      .where(and(eq(issues.villageId, villageId), eq(issues.status, 'open')));

    const [collectionsToday] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        and(
          eq(households.villageId, villageId),
          gte(wasteCollections.collectionDate, today),
          lt(wasteCollections.collectionDate, tomorrow)
        )
      );

    return {
      totalHouseholds: householdsCount.count,
      totalCollectors: collectorsCount.count,
      openIssues: openIssuesCount.count,
      collectionsToday: collectionsToday.count,
    };
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

    const [villagesCount] = await db.select({ count: count() }).from(villages);
    const [managersCount] = await db.select({ count: count() }).from(users).where(eq(users.role, 'manager'));
    const [openIssuesCount] = await db.select({ count: count() }).from(issues).where(eq(issues.status, 'open'));
    const [collectionsToday] = await db
      .select({ count: count() })
      .from(wasteCollections)
      .where(
        and(
          gte(wasteCollections.collectionDate, today),
          lt(wasteCollections.collectionDate, tomorrow)
        )
      );

    return {
      totalVillages: villagesCount.count,
      totalManagers: managersCount.count,
      totalOpenIssues: openIssuesCount.count,
      totalCollectionsToday: collectionsToday.count,
    };
  }

  async getManagersList(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'manager')).orderBy(users.name);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.userId, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.userId, userId));
  }

  async deleteVillage(villageId: string): Promise<void> {
    await db.delete(villages).where(eq(villages.villageId, villageId));
  }

  async getVillageDetails(villageId: string): Promise<any> {
    const village = await this.getVillageByVillageId(villageId);
    if (!village) return null;

    const households = await this.getHouseholdsByVillage(villageId);
    const collectors = await this.getCollectorsByVillage(villageId);
    const stats = await this.getVillageStats(villageId);

    return {
      ...village,
      households,
      collectors,
      stats,
    };
  }

  async addManagerToVillage(villageData: { villageId: string; managerName: string; managerPhone: string }): Promise<User> {
    const { villageId, managerName, managerPhone } = villageData;
    
    // Generate manager user ID
    const managerUserId = `${villageId}-M1`;
    const defaultPassword = await bcrypt.hash("Manager123", 10);

    const newManager = await this.createUser({
      userId: managerUserId,
      password: defaultPassword,
      role: "manager",
      villageId: villageId,
      name: managerName,
      phone: managerPhone,
      isFirstLogin: true,
    });

    return newManager;
  }
}

export const storage = new DatabaseStorage();