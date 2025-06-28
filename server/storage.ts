import bcrypt from "bcrypt";
import {
  villages,
  users,
  households,
  collectors,
  wasteCollections,
  issues,
  announcements,
  attendance,
  feedback,
  segregators,
  segregatorAttendance,
  collectorComplaints,
  moderators,
  moderatorVillageAssignments,
  type Village,
  type User,
  type Household,
  type Collector,
  type WasteCollection,
  type Issue,
  type Announcement,
  type Attendance,
  type Feedback,
  type Segregator,
  type SegregatorAttendance,
  type CollectorComplaint,
  type Moderator,
  type ModeratorVillageAssignment,
  type InsertVillage,
  type InsertUser,
  type InsertHousehold,
  type InsertCollector,
  type InsertWasteCollection,
  type InsertIssue,
  type InsertAnnouncement,
  type InsertAttendance,
  type InsertFeedback,
  type InsertSegregator,
  type InsertSegregatorAttendance,
  type InsertCollectorComplaint,
  type InsertModerator,
  type InsertModeratorVillageAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, avg, sum, gte, lte, isNotNull, and, or, like, asc, sql, lt, inArray } from "drizzle-orm";

interface DetailedAttendance {
  id: number;
  collectorId?: number;
  segregatorId?: number;
  date: string | Date;
  isPresent?: boolean;
  status?: 'present' | 'absent' | 'half_day';
  startTime?: string;
  endTime?: string;
  workHours?: number;
  workRating?: number;
  dailyReview?: string;
  performanceRating?: number;
  remarks?: string;
  markedBy: string;
  name: string;
}

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

  // Collector operations
  createCollector(collector: InsertCollector): Promise<Collector>;
  getCollectorsByVillage(villageId: string): Promise<Collector[]>;
  getCollectorByUid(uid: string): Promise<Collector | undefined>;

  // Waste collection operations
  createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection>;
  getCollectionsByHousehold(householdId: number): Promise<WasteCollection[]>;
  getCollectionsByCollector(collectorId: number): Promise<WasteCollection[]>;

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

  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByCollectorAndDate(collectorId: number, date: Date): Promise<Attendance | undefined>;
  getAttendanceByVillageAndDate(villageId: string, date: Date): Promise<Attendance[]>;

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

  // Segregator operations
  createSegregator(segregator: InsertSegregator): Promise<Segregator>;
  getSegregatorsByVillage(villageId: string): Promise<Segregator[]>;
  updateSegregator(id: number, updates: Partial<Segregator>): Promise<Segregator>;
  deleteSegregator(id: number): Promise<void>;

  // Segregator attendance operations
  markSegregatorAttendance(attendance: InsertSegregatorAttendance): Promise<SegregatorAttendance>;
  getSegregatorAttendance(segregatorId: number, startDate?: Date, endDate?: Date): Promise<SegregatorAttendance[]>;
  getVillageSegregatorAttendance(villageId: string, date: Date): Promise<SegregatorAttendance[]>;



  // Enhanced collector operations
  deleteCollector(id: number): Promise<void>;
  getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    attendanceRate: number;
    complaintsCount: number;
  }>;

  // Enhanced attendance operations
  markDetailedAttendance(attendance: {
    collectorId: number;
    date: Date;
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workHours?: number;
    dailyReview?: string;
    performanceRating?: number;
    markedBy: string;
  }): Promise<Attendance>;

  getCollectorAttendanceHistory(collectorId: number, startDate?: Date, endDate?: Date): Promise<Attendance[]>;

  // Collector complaints operations
  createCollectorComplaint(complaint: {
    collectorId: number;
    householdId: number;
    complaint: string;
  }): Promise<any>;

  getCollectorComplaints(collectorId: number): Promise<any[]>;
  resolveCollectorComplaint(complaintId: number, managerResponse: string): Promise<void>;

  // Enhanced segregator operations  
  markSegregatorDetailedAttendance(attendance: {
    segregatorId: number;
    date: Date;
    status: "present" | "absent" | "half_day";
    startTime?: string;
    endTime?: string;
    workHours?: number;
    workRating?: number;
    dailyReview?: string;
    remarks?: string;
    markedBy: string;
  }): Promise<any>;

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

  getDetailedAttendanceByVillageAndDate(villageId: string, date: Date): Promise<DetailedAttendance[]>;
  getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined>;
  getComplaintsByVillage(villageId: string): Promise<any[]>;

  // Moderator operations
  createModerator(moderator: InsertModerator): Promise<Moderator>;
  getModeratorsList(): Promise<Moderator[]>;
  updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator>;
  deleteModerator(moderatorId: string): Promise<void>;
  assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment>;
  removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void>;
  getModeratorVillages(moderatorId: string): Promise<any[]>;
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

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const issueData = {
      ...insertIssue,
      status: insertIssue.status || 'open',
      createdAt: new Date(),
    };

    console.log('Inserting issue into database:', issueData);

    const [issue] = await db
      .insert(issues)
      .values(issueData)
      .returning();

    console.log('Issue inserted successfully:', issue);
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

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values(insertAnnouncement)
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

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [attendanceRecord] = await db
      .insert(attendance)
      .values(insertAttendance)
      .returning();
    return attendanceRecord;
  }

  async getAttendanceByCollectorAndDate(collectorId: number, date: Date): Promise<Attendance | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [attendanceRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.collectorId, collectorId),
          sql`${attendance.date} >= ${startOfDay} AND ${attendance.date} <= ${endOfDay}`
        )
      );
    return attendanceRecord || undefined;
  }

  async getAttendanceByVillageAndDate(villageId: string, date: Date): Promise<Attendance[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceRecords = await db
      .select({
        id: attendance.id,
        collectorId: attendance.collectorId,
        date: attendance.date,
        isPresent: attendance.isPresent,
        markedBy: attendance.markedBy,
        createdAt: attendance.createdAt,
      })
      .from(attendance)
      .innerJoin(collectors, eq(attendance.collectorId, collectors.id))
      .where(
        and(
          eq(collectors.villageId, villageId),
          sql`${attendance.date} >= ${startOfDay} AND ${attendance.date} <= ${endOfDay}`
        )
      );

    return attendanceRecords as Attendance[];
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
    let query = db
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
      .where(eq(households.villageId, villageId));

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query = query.where(
        and(
          eq(households.villageId, villageId),
          sql`${wasteCollections.collectionDate} >= ${startDate}`,
          sql`${wasteCollections.collectionDate} <= ${endDate}`
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
    return await db.select().from(users).where(eq(users.role, 'manager'));
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

    // 2. Delete feedback and attendance for this village's collectors
    await db.delete(feedback)
      .where(sql`collector_id IN (SELECT id FROM collectors WHERE village_id = ${villageId})`);

    await db.delete(attendance)
      .where(sql`collector_id IN (SELECT id FROM collectors WHERE village_id = ${villageId})`);

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
      // Get collections data with village information
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
        .groupBy(households.villageId, villages.name);

      // Apply village filter
      if (filters.village) {
        collectionsQuery = collectionsQuery.where(eq(households.villageId, filters.village));
      }

      // Apply date filters
      if (filters.startDate) {
        collectionsQuery = collectionsQuery.where(
          sql`${wasteCollections.collectionDate} >= ${filters.startDate}`
        );
      }
      if (filters.endDate) {
        collectionsQuery = collectionsQuery.where(
          sql`${wasteCollections.collectionDate} <= ${filters.endDate}`
        );
      }

      const collectionsData = await collectionsQuery;

      // Ensure numeric values are properly converted
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
      console.error("Generate report error:", error);
      return { collections: [] };
    }
  }

  async getVillageDetails(villageId: string): Promise<any> {
    const village = await this.getVillageByVillageId(villageId);
    const stats = await this.getVillageStats(villageId);
    const managers = await db.select().from(users).where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));
    const households = await this.getHouseholdsByVillage(villageId);
    const collectors = await this.getCollectorsByVillage(villageId);
    const issues = await this.getIssuesByVillage(villageId);

    return {
      village,
      stats,
      managers,
      households,
      collectors,
      issues,
    };
  }

  async addManagerToVillage(villageData: { villageId: string; managerName: string; managerPhone: string }): Promise<User> {
    const { villageId, managerName, managerPhone } = villageData;

    const existingManagers = await db.select().from(users)
      .where(and(eq(users.villageId, villageId), eq(users.role, 'manager')));

    const managerNumber = existingManagers.length + 1;
    const managerId = `${villageId}-M${managerNumber}`;
    const hashedPassword = await bcrypt.hash(managerId, 10);

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

  // Segregator operations
  async createSegregator(insertSegregator: InsertSegregator): Promise<Segregator> {
    const [segregator] = await db.insert(segregators).values(insertSegregator).returning();
    return segregator;
  }

  async getSegregatorsByVillage(villageId: string): Promise<Segregator[]> {
    return db.select().from(segregators).where(eq(segregators.villageId, villageId));
  }

  async updateSegregator(id: number, updates: Partial<Segregator>): Promise<Segregator> {
    const [segregator] = await db.update(segregators)
      .set(updates)
      .where(eq(segregators.id, id))
      .returning();
    return segregator;
  }

  async deleteSegregator(id: number): Promise<void> {
    await db.delete(segregators).where(eq(segregators.id, id));
  }

  // Segregator attendance operations
  async markSegregatorAttendance(insertAttendance: InsertSegregatorAttendance): Promise<SegregatorAttendance> {
    const [attendance] = await db.insert(segregatorAttendance).values(insertAttendance).returning();
    return attendance;
  }

  async getSegregatorAttendance(segregatorId: number, startDate?: Date, endDate?: Date): Promise<SegregatorAttendance[]> {
    if (startDate && endDate) {
      return db.select().from(segregatorAttendance).where(
        and(
          eq(segregatorAttendance.segregatorId, segregatorId),
          sql`${segregatorAttendance.date} >= ${startDate}`,
          sql`${segregatorAttendance.date} <= ${endDate}`
        )
      );
    }

    return db.select().from(segregatorAttendance).where(eq(segregatorAttendance.segregatorId, segregatorId));
  }

  async getVillageSegregatorAttendance(villageId: string, date: Date): Promise<SegregatorAttendance[]> {
    return db.select({
      id: segregatorAttendance.id,
      segregatorId: segregatorAttendance.segregatorId,
      date: segregatorAttendance.date,
      status: segregatorAttendance.status,
      workRating: segregatorAttendance.workRating,
      remarks: segregatorAttendance.remarks,
      markedBy: segregatorAttendance.markedBy,
      createdAt: segregatorAttendance.createdAt,
      segregatorName: segregators.name,
    })
    .from(segregatorAttendance)
    .innerJoin(segregators, eq(segregatorAttendance.segregatorId, segregators.id))
    .where(
      and(
        eq(segregators.villageId, villageId),
        eq(segregatorAttendance.date, date)
      )
    );
  }

  // Enhanced collector management operations
  async markDetailedAttendance(attendanceData: {
    collectorId: number;
    date: Date;
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workHours?: number;
    dailyReview?: string;
    performanceRating?: number;
    markedBy: string;
  }): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceData).returning();
    return newAttendance;
  }

  async getCollectorAttendanceHistory(collectorId: number, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    let whereConditions = [eq(attendance.collectorId, collectorId)];

    if (startDate) {
      whereConditions.push(sql`${attendance.date} >= ${startDate}`);
    }
    if (endDate) {
      whereConditions.push(sql`${attendance.date} <= ${endDate}`);
    }

    return db.select()
      .from(attendance)
      .where(and(...whereConditions))
      .orderBy(desc(attendance.date));
  }

  async createCollectorComplaint(complaint: {
    collectorId: number;
    householdId: number;
    complaint: string;
  }): Promise<any> {
    const [newComplaint] = await db.insert(collectorComplaints).values(complaint).returning();
    return newComplaint;
  }

  async getCollectorComplaints(collectorId: number): Promise<any[]> {
    return db.select({
      id: collectorComplaints.id,
      complaint: collectorComplaints.complaint,
      status: collectorComplaints.status,
      managerResponse: collectorComplaints.managerResponse,
      createdAt: collectorComplaints.createdAt,
      resolvedAt: collectorComplaints.resolvedAt,
      householdId: collectorComplaints.householdId,
      householdUid: households.uid,
      headName: households.headName,
      houseNumber: households.houseNumber,
    })
    .from(collectorComplaints)
    .innerJoin(households, eq(collectorComplaints.householdId, households.id))
    .where(eq(collectorComplaints.collectorId, collectorId))
    .orderBy(desc(collectorComplaints.createdAt));
  }

  async resolveCollectorComplaint(complaintId: number, managerResponse: string): Promise<void> {
    await db.update(collectorComplaints)
      .set({ 
        status: "resolved", 
        managerResponse, 
        resolvedAt: new Date() 
      })
      .where(eq(collectorComplaints.id, complaintId));
  }

  async markSegregatorDetailedAttendance(attendanceData: {
    segregatorId: number;
    date: Date;
    status: "present" | "absent" | "half_day";
    startTime?: string;
    endTime?: string;
    workHours?: number;
    workRating?: number;
    dailyReview?: string;
    remarks?: string;
    markedBy: string;
  }): Promise<any> {
    const [attendance] = await db.insert(segregatorAttendance).values(attendanceData).returning();
    return attendance;
  }

  // Enhanced collector operations
  async deleteCollector(id: number): Promise<void> {
    await db.delete(collectors).where(eq(collectors.id, id));
  }

  async getCollectorStats(collectorId: number): Promise<{
    totalCollections: number;
    averageRating: number;
    attendanceRate: number;
    complaintsCount: number;
  }> {
    // Get total collections
    const [collectionCount] = await db.select({ count: count() })
      .from(wasteCollections)
      .where(eq(wasteCollections.collectorId, collectorId));

    // Get complaints count
    const [complaintsCount] = await db.select({ count: count() })
      .from(collectorComplaints)
      .where(eq(collectorComplaints.collectorId, collectorId));

    const feedbackResults = await db.select()
      .from(feedback)
      .where(eq(feedback.toCollectorId, collectorId));

    const avgRating = feedbackResults.length > 0 
      ? feedbackResults.reduce((sum, f) => sum + f.rating, 0) / feedbackResults.length 
      : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [attendanceCount] = await db.select({ count: count() })
      .from(attendance)
      .where(and(
        eq(attendance.collectorId, collectorId),
        sql`${attendance.date} >= ${thirtyDaysAgo}`
      ));

    // Get attendance data for rate calculation
    const [presentCount] = await db.select({ count: count() })
      .from(attendance)
      .where(and(
        eq(attendance.collectorId, collectorId),
        eq(attendance.isPresent, true),
        sql`${attendance.date} >= ${thirtyDaysAgo}`
      ));

    return {
      totalCollections: collectionCount.count || 0,
      averageRating: avgRating,
      attendanceRate: attendanceCount.count > 0 ? (presentCount.count / attendanceCount.count) * 100 : 0,
      complaintsCount: complaintsCount.count || 0,
    };
  }

  // Enhanced household operations
  async updateHousehold(id: number, updates: Partial<Household>): Promise<Household> {
    const [household] = await db.update(households)
      .set(updates)
      .where(eq(households.id, id))
      .returning();
    return household;
  }

  async deleteHousehold(id: number): Promise<void> {
    await db.delete(households).where(eq(households.id, id));
  }

  async getDetailedAttendanceByVillageAndDate(villageId: string, date: Date): Promise<DetailedAttendance[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get collector attendance
    const collectorAttendance = await db
      .select({
        id: attendance.id,
        collectorId: attendance.collectorId,
        segregatorId: sql<number | null>`NULL`,
        date: attendance.date,
        isPresent: attendance.isPresent,
        status: sql<string | null>`NULL`,
        startTime: attendance.startTime,
        endTime: attendance.endTime,
        workHours: attendance.workHours,
        workRating: sql<number | null>`NULL`,
        dailyReview: attendance.dailyReview,
        performanceRating: attendance.performanceRating,
        remarks: sql<string | null>`NULL`,
        markedBy: attendance.markedBy,
        name: collectors.name,
      })
      .from(attendance)
      .innerJoin(collectors, eq(attendance.collectorId, collectors.id))
      .where(
        and(
          eq(collectors.villageId, villageId),
          sql`${attendance.date} >= ${startOfDay} AND ${attendance.date} <= ${endOfDay}`
        )
      );

    // Get segregator attendance
    const segregatorAttendanceData = await db
      .select({
        id: segregatorAttendance.id,
        collectorId: sql<number | null>`NULL`,
        segregatorId: segregatorAttendance.segregatorId,
        date: segregatorAttendance.date,
        isPresent: sql<boolean | null>`CASE WHEN ${segregatorAttendance.status} = 'present' THEN true ELSE false END`,
        status: segregatorAttendance.status,
        startTime: segregatorAttendance.startTime,
        endTime: segregatorAttendance.endTime,
        workHours: segregatorAttendance.workHours,
        workRating: segregatorAttendance.workRating,
        dailyReview: segregatorAttendance.dailyReview,
        performanceRating: sql<number | null>`NULL`,
        remarks: segregatorAttendance.remarks,
        markedBy: segregatorAttendance.markedBy,
        name: segregators.name,
      })
      .from(segregatorAttendance)
      .innerJoin(segregators, eq(segregatorAttendance.segregatorId, segregators.id))
      .where(
        and(
          eq(segregators.villageId, villageId),
          sql`${segregatorAttendance.date} >= ${startOfDay} AND ${segregatorAttendance.date} <= ${endOfDay}`
        )
      );

    return [...collectorAttendance, ...segregatorAttendanceData] as any[];
  }

  async getHouseholdByGeneratorUserId(generatorUserId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.generatorUserId, generatorUserId));
    return household || undefined;
  }

  async getComplaintsByVillage(villageId: string): Promise<any[]> {
    return db.select({
      id: collectorComplaints.id,
      collectorId: collectorComplaints.collectorId,
      householdId: collectorComplaints.householdId,
      complaint: collectorComplaints.complaint,
      status: collectorComplaints.status,
      managerResponse: collectorComplaints.managerResponse,
      createdAt: collectorComplaints.createdAt,
      resolvedAt: collectorComplaints.resolvedAt,
      collectorName: collectors.name,
      householdUid: households.uid,
    })
    .from(collectorComplaints)
    .innerJoin(collectors, eq(collectorComplaints.collectorId, collectors.id))
    .innerJoin(households, eq(collectorComplaints.householdId, households.id))
    .where(eq(collectors.villageId, villageId))
    .orderBy(desc(collectorComplaints.createdAt));
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
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let householdsQuery = db.select({ count: count() }).from(households);
    let collectionsQuery = db
      .select({ count: count() })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(
        sql`${wasteCollections.collectionDate} >= ${targetDate} AND ${wasteCollections.collectionDate} < ${nextDay}`
      );

    if (villageId && villageId !== 'all') {
      householdsQuery = householdsQuery.where(eq(households.villageId, villageId));
      collectionsQuery = collectionsQuery.where(eq(households.villageId, villageId));
    }

    const [householdsCount] = await householdsQuery;
    const [collectionsCount] = await collectionsQuery;

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
        )
      );

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

    return {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Apply village filter where needed
    const villageCondition = villageFilter ? eq(households.villageId, villageFilter) : sql`1=1`;
    const collectorVillageCondition = villageFilter ? eq(collectors.villageId, villageFilter) : sql`1=1`;

    const [villagesCount] = await db
      .select({ count: count() })
      .from(villages)
      .where(villageFilter ? eq(villages.villageId, villageFilter) : sql`1=1`);

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

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

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
      .where(villageCondition);

    const topVillages = await db.select({
        villageName: villages.name,
        avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .innerJoin(villages, eq(households.villageId, villages.villageId))
      .where(villageCondition)
      .groupBy(villages.villageId, villages.name)
      .orderBy(desc(sql`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`))
      .limit(5);

    const collectionTrends = await db.select({
        date: sql<string>`DATE(${wasteCollections.collectionDate})`,
        collections: count(wasteCollections.id),
        avgRating: sql<number>`COALESCE(AVG(CAST(${wasteCollections.segregationRating} AS DECIMAL(3,2))), 0)`
      })
      .from(wasteCollections)
      .innerJoin(households, eq(wasteCollections.householdId, households.id))
      .where(villageCondition)
      .groupBy(sql`DATE(${wasteCollections.collectionDate})`)
      .orderBy(sql`DATE(${wasteCollections.collectionDate})`);

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
    const avgRating = Number(avgSegregation.avg) || 0;

    return {
      totalVillages: villagesCount.count,
      totalHouseholds: householdsCount.count,
      totalCollectors: collectorsCount.count,
      totalCollectionsToday: collectionsToday.count,
      totalCollectionsThisWeek: collectionsThisWeek.count,
      averageSegregationRating: parseFloat(avgRating.toFixed(2)),
      topPerformingVillages: topVillages.map(v => ({
        ...v, 
        avgRating: parseFloat((Number(v.avgRating) || 0).toFixed(2))
      })),
      collectionTrends: collectionTrends.map(t => ({
        ...t,
        avgRating: parseFloat((Number(t.avgRating) || 0).toFixed(2))
      })),
      segregationRateDistribution: segregationDistribution,
    };
  }
}

export const storage = new DatabaseStorage();