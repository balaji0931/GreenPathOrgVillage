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
    getHouseholdsByVillage(villageId: string): Promise<any[]>;
    getHouseholdByUid(uid: string): Promise<any>;
    updateHousehold(id: number, updates: Partial<Household>): Promise<Household>;
    getWardsByVillage(villageId: string): Promise<string[]>;
    addWardToVillage(villageId: string, ward: string): Promise<string[]>;

    // Collector operations
    createCollector(collector: InsertCollector): Promise<Collector>;
    getCollectorsByVillage(villageId: string): Promise<Collector[]>;
    getCollectorByUid(uid: string): Promise<Collector | undefined>;

    // Waste collection operations
    createWasteCollection(collection: InsertWasteCollection): Promise<WasteCollection>;
    getCollectionsByHousehold(householdId: number, options?: { limit?: number; offset?: number }): Promise<{
        data: any[];
        stats: { avgRating: number; totalCollections: number }
    }>;
    getCollectionsByCollector(collectorId: number): Promise<WasteCollection[]>;
    checkExistingCollection(householdId: number, collectorId: number, date: string): Promise<any>;

    // Issue operations
    createIssue(issue: InsertIssue): Promise<Issue>;
    getIssuesByVillage(villageId: string): Promise<Issue[]>;
    updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;

    // Enhanced collection operations for manager
    getCollectionsByVillageWithDetails(villageId: string, date?: string, householdId?: number): Promise<any[]>;
    getDailyCollectionSummary(villageId: string, date: string): Promise<{
        date: string;
        needsAttention: Array<{ householdId: number; uid: string; headName: string; houseNumber: string | null; ward: string | null; phone: string | null; latitude: string | null; longitude: string | null; segregationRating: number; photoUrl: string | null; voiceUrl: string | null; collectorName: string }>;
        households: Array<{ id: number; uid: string; headName: string; houseNumber: string | null; ward: string | null; phone: string | null; latitude: string | null; longitude: string | null; collected: boolean; segregationRating: number | null; collectorName: string | null; collectionPhotoUrl: string | null; collectionVoiceUrl: string | null; collectionTime: string | null }>;
    }>;

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

    // Admin management methods
    getManagersList(): Promise<any[]>;
    updateUser(userId: string, updates: Partial<User>): Promise<User>;
    deleteUser(userId: string): Promise<void>;
    deleteVillage(villageId: string): Promise<void>;

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
    getPremiumReportData(villageId: string, date: string): Promise<any>;
    getHouseholdByGeneratorUserId(generatorUserId: string): Promise<any>;

    // Moderator operations
    createModerator(moderator: InsertModerator): Promise<Moderator>;
    getModeratorsList(): Promise<Moderator[]>;
    updateModerator(moderatorId: string, updates: Partial<Moderator>): Promise<Moderator>;
    deleteModerator(moderatorId: string): Promise<void>;
    assignVillageToModerator(assignment: InsertModeratorVillageAssignment): Promise<ModeratorVillageAssignment>;
    removeVillageFromModerator(moderatorId: string, villageId: string): Promise<void>;
    getModeratorVillages(moderatorId: string): Promise<any[]>;
    getModeratorOverviewStats(villageIds: string[], date: string): Promise<any>;
    getVillageAttendanceDaily(villageId: string, date: string, workerType: string): Promise<any>;

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
    getQRCodeCountByVillage(villageId: string): Promise<number>;
    getUnmappedQRCodesByVillage(villageId: string): Promise<QRCode[]>;
    getUnmappedQRCodesByBatch(batchId: string): Promise<QRCode[]>;

    // Field worker operations
    getFieldWorkersByVillage(villageId: string): Promise<any[]>;
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
