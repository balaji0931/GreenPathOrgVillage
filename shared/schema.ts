import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, date, real, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Villages table
export const villages = pgTable("villages", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().unique(), // V001, V002, etc.
  name: text("name").notNull(),
  imageUploadRequired: boolean("image_upload_required").default(true), // Require image upload for collections
  wards: text("wards").array().default([]), // Array of ward names for this village
  locationServicesEnabled: boolean("location_services_enabled").default(false), // Admin setting for location mapping
  vehicles: json("vehicles").$type<{ registrationNumber: string; name: string; collectorIds: number[] }[]>().default([]), // Array of vehicles
  totalHouseholds: integer("total_households").notNull().default(0), // Pre-calculated household count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table with role-based structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // V001-M1, V001-C1, V001-G1, etc.
  password: text("password").notNull(),
  role: text("role").notNull(), // admin, manager, collector, generator
  villageId: text("village_id").references(() => villages.villageId),
  name: text("name").notNull(),
  phone: text("phone"),
  isFirstLogin: boolean("is_first_login").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_user_id").on(table.userId),
  index("idx_users_role_village").on(table.role, table.villageId),
]);

// Households (Waste Generators)
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  headName: text("head_name").notNull(),
  phone: text("phone"),
  houseNumber: text("house_number"),
  ward: text("ward").default("Ward-1"), // Ward/Sub-village identification
  familySize: integer("family_size").default(1),
  address: text("address"),
  status: text("status").default("active"),

  qrPrinted: boolean("qr_printed").default(false), // Track if QR code has been printed
  generatorUserId: text("generator_user_id"),
  generatorPassword: text("generator_password"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_households_village_ward_status").on(table.villageId, table.ward, table.status),
  index("idx_households_village_id").on(table.villageId),
  index("idx_households_uid").on(table.uid),
]);

// Waste Collectors
export const collectors = pgTable("collectors", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // V001-C1, V001-C2, etc.
  villageId: text("village_id").notNull().references(() => villages.villageId),
  name: text("name").notNull(),
  phone: text("phone"),
  assignedVehicle: text("assigned_vehicle"), // Registration number of assigned vehicle
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_collectors_village_id").on(table.villageId),
  index("idx_collectors_uid").on(table.uid),
]);

// Waste Collections
export const wasteCollections = pgTable("waste_collections", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  collectionDate: timestamp("collection_date"),
  segregationRating: integer("segregation_rating"), // 1-5 stars
  plasticRating: integer("plastic_rating"), // 1-5 stars
  observations: json("observations").$type<string[]>(), // checkboxes
  remarks: text("remarks"),
  photoUrl: text("photo_url"), // only for ratings <= 3
  voiceUrl: text("voice_url"), // voice recording URL
  status: text("status").default("collected"), // collected, missed
  missedReason: text("missed_reason"),
}, (table) => [
  index("idx_waste_collections_household_collector_date").on(table.householdId, table.collectorId, table.collectionDate),
  index("idx_waste_collections_household_date").on(table.householdId, table.collectionDate),
  index("idx_waste_collections_collector_date").on(table.collectorId, table.collectionDate),
  index("idx_waste_collections_collection_date").on(table.collectionDate),
]);

// Issues
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  reportedBy: text("reported_by").notNull(), // UID of reporter
  villageId: text("village_id").notNull().references(() => villages.villageId),
  status: text("status").default("open"), // open, in_progress, resolved
  photoUrl: text("photo_url"), // Photo uploaded by reporter
  managerReply: text("manager_reply"),
  managerProofPhotoUrl: text("manager_proof_photo_url"), // Proof photo required from manager when updating status
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_issues_village_status_created").on(table.villageId, table.status, table.createdAt),
  index("idx_issues_village_created").on(table.villageId, table.createdAt),
  index("idx_issues_status").on(table.status),
]);

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  targetAudience: text("target_audience").notNull(), // all, managers, generators
  villageId: text("village_id").references(() => villages.villageId), // null for global
  createdBy: text("created_by").notNull(), // UID of creator
  photoUrl: text("photo_url"), // Optional image URL from Cloudinary
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_announcements_village_created").on(table.villageId, table.createdAt),
  index("idx_announcements_target_audience").on(table.targetAudience),
]);

// Feedback (from generators to collectors for specific collections)
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  fromHouseholdId: integer("from_household_id").notNull().references(() => households.id),
  toCollectorId: integer("to_collector_id").notNull().references(() => collectors.id),
  rating: integer("rating").notNull(), // 1-5 stars
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feedback_collector_created").on(table.toCollectorId, table.createdAt),
  index("idx_feedback_household_collector").on(table.fromHouseholdId, table.toCollectorId),
]);

// Relations
export const villagesRelations = relations(villages, ({ many }) => ({
  users: many(users),
  households: many(households),
  collectors: many(collectors),
  issues: many(issues),
}));

export const usersRelations = relations(users, ({ one }) => ({
  village: one(villages, {
    fields: [users.villageId],
    references: [villages.villageId],
  }),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  village: one(villages, {
    fields: [households.villageId],
    references: [villages.villageId],
  }),
  wasteCollections: many(wasteCollections),
  feedback: many(feedback),
}));

export const collectorsRelations = relations(collectors, ({ one, many }) => ({
  village: one(villages, {
    fields: [collectors.villageId],
    references: [villages.villageId],
  }),
  wasteCollections: many(wasteCollections),
  feedback: many(feedback),
}));

export const wasteCollectionsRelations = relations(wasteCollections, ({ one }) => ({
  household: one(households, {
    fields: [wasteCollections.householdId],
    references: [households.id],
  }),
  collector: one(collectors, {
    fields: [wasteCollections.collectorId],
    references: [collectors.id],
  }),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  village: one(villages, {
    fields: [issues.villageId],
    references: [villages.villageId],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  household: one(households, {
    fields: [feedback.fromHouseholdId],
    references: [households.id],
  }),
  collector: one(collectors, {
    fields: [feedback.toCollectorId],
    references: [collectors.id],
  }),
}));

// Insert schemas
export const insertVillageSchema = createInsertSchema(villages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  createdAt: true,
});

export const insertCollectorSchema = createInsertSchema(collectors).omit({
  id: true,
  createdAt: true,
});

export const insertWasteCollectionSchema = createInsertSchema(wasteCollections).omit({
  id: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

// Moderators table
export const moderators = pgTable("moderators", {
  id: serial("id").primaryKey(),
  moderatorId: text("moderator_id").notNull().unique(), // MOD-001, MOD-002, etc.
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdBy: text("created_by").notNull(), // Admin who created this moderator
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Moderator village assignments
export const moderatorVillageAssignments = pgTable("moderator_village_assignments", {
  id: serial("id").primaryKey(),
  moderatorId: text("moderator_id").notNull().references(() => moderators.moderatorId),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  assignedBy: text("assigned_by").notNull(), // Admin who assigned this village
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Relations for moderators
export const moderatorsRelations = relations(moderators, ({ many }) => ({
  villageAssignments: many(moderatorVillageAssignments),
}));

export const moderatorVillageAssignmentsRelations = relations(moderatorVillageAssignments, ({ one }) => ({
  moderator: one(moderators, {
    fields: [moderatorVillageAssignments.moderatorId],
    references: [moderators.moderatorId],
  }),
  village: one(villages, {
    fields: [moderatorVillageAssignments.villageId],
    references: [villages.villageId],
  }),
}));

// Insert schemas for moderators
export const insertModeratorSchema = createInsertSchema(moderators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModeratorVillageAssignmentSchema = createInsertSchema(moderatorVillageAssignments).omit({
  id: true,
  assignedAt: true,
});


// Website feedback table (for public home page feedback form)
export const websiteFeedback = pgTable("website_feedback", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  feedbackType: text("feedback_type").notNull(), // suggestion, bug_report, general
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact us table (for public home page contact form)
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pre-generated QR codes table (for field worker mapping)
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // GEN-V001-0001, GEN-V001-0002, etc.

  status: text("status").default("notMapped"), // notMapped, mapped
  villageId: text("village_id").notNull().references(() => villages.villageId),
  householdId: integer("household_id").references(() => households.id),
  batchId: text("batch_id").notNull(), // BATCH-V001-001, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for qr_codes
export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  village: one(villages, {
    fields: [qrCodes.villageId],
    references: [villages.villageId],
  }),
  household: one(households, {
    fields: [qrCodes.householdId],
    references: [households.id],
  }),
}));

// Insert schema for qr_codes
export const insertQRCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true,
});


// Insert schemas for new tables
export const insertWebsiteFeedbackSchema = createInsertSchema(websiteFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type InsertCollector = z.infer<typeof insertCollectorSchema>;
export type InsertWasteCollection = z.infer<typeof insertWasteCollectionSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type InsertModerator = z.infer<typeof insertModeratorSchema>;
export type InsertModeratorVillageAssignment = z.infer<typeof insertModeratorVillageAssignmentSchema>;

export type InsertWebsiteFeedback = z.infer<typeof insertWebsiteFeedbackSchema>;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type InsertQRCode = z.infer<typeof insertQRCodeSchema>;

export type Village = typeof villages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Collector = typeof collectors.$inferSelect;
export type WasteCollection = typeof wasteCollections.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Moderator = typeof moderators.$inferSelect;
export type ModeratorVillageAssignment = typeof moderatorVillageAssignments.$inferSelect;

export type WebsiteFeedback = typeof websiteFeedback.$inferSelect;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type QRCode = typeof qrCodes.$inferSelect;

// Daily Waste Quantity Log - One entry per date per village
export const dailyWasteLog = pgTable("daily_waste_log", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  date: date("date").notNull(),
  wetWasteKg: decimal("wet_waste_kg", { precision: 10, scale: 2 }).default("0"),
  wetWastePhotoUrl: text("wet_waste_photo_url"),
  dryWasteKg: decimal("dry_waste_kg", { precision: 10, scale: 2 }).default("0"),
  dryWastePhotoUrl: text("dry_waste_photo_url"),
  rejectedWasteKg: decimal("rejected_waste_kg", { precision: 10, scale: 2 }).default("0"),
  rejectedWastePhotoUrl: text("rejected_waste_photo_url"),
  sanitaryWasteKg: decimal("sanitary_waste_kg", { precision: 10, scale: 2 }).default("0"),
  sanitaryWastePhotoUrl: text("sanitary_waste_photo_url"),
  remarks: text("remarks"),
  createdBy: text("created_by").notNull(), // Manager user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_daily_waste_log_village_date").on(table.villageId, table.date),
  index("idx_daily_waste_log_date").on(table.date),
]);

// Compost Production Log - Event-based logging
export const compostProductionLog = pgTable("compost_production_log", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  date: date("date").notNull(),
  quantityKg: decimal("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  compostStatus: text("compost_status").notNull(), // 'good', 'average', 'bad'
  photoUrl: text("photo_url").notNull(), // Mandatory
  remarks: text("remarks"),
  createdBy: text("created_by").notNull(), // Manager user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_compost_log_village_date").on(table.villageId, table.date),
  index("idx_compost_log_date").on(table.date),
]);

// Dry Waste Sales Log - Parent table
export const dryWasteSales = pgTable("dry_waste_sales", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  saleDate: date("sale_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"), // Auto-calculated sum
  receiptImageUrl: text("receipt_image_url"), // Optional
  remarks: text("remarks"),
  createdBy: text("created_by").notNull(), // Manager user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dry_waste_sales_village_date").on(table.villageId, table.saleDate),
  index("idx_dry_waste_sales_date").on(table.saleDate),
]);

// Dry Waste Sale Materials - Child table (multiple per sale)
export const dryWasteSaleMaterials = pgTable("dry_waste_sale_materials", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => dryWasteSales.id, { onDelete: "cascade" }),
  materialType: text("material_type").notNull(), // From dropdown list
  quantityKg: decimal("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  ratePerKg: decimal("rate_per_kg", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Auto-calculated: quantity * rate
}, (table) => [
  index("idx_sale_materials_sale_id").on(table.saleId),
]);

// Relations for Material & Output Log tables
export const dailyWasteLogRelations = relations(dailyWasteLog, ({ one }) => ({
  village: one(villages, {
    fields: [dailyWasteLog.villageId],
    references: [villages.villageId],
  }),
}));

export const compostProductionLogRelations = relations(compostProductionLog, ({ one }) => ({
  village: one(villages, {
    fields: [compostProductionLog.villageId],
    references: [villages.villageId],
  }),
}));

export const dryWasteSalesRelations = relations(dryWasteSales, ({ one, many }) => ({
  village: one(villages, {
    fields: [dryWasteSales.villageId],
    references: [villages.villageId],
  }),
  materials: many(dryWasteSaleMaterials),
}));

export const dryWasteSaleMaterialsRelations = relations(dryWasteSaleMaterials, ({ one }) => ({
  sale: one(dryWasteSales, {
    fields: [dryWasteSaleMaterials.saleId],
    references: [dryWasteSales.id],
  }),
}));

// Insert schemas for Material & Output Log
export const insertDailyWasteLogSchema = createInsertSchema(dailyWasteLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompostProductionLogSchema = createInsertSchema(compostProductionLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDryWasteSaleSchema = createInsertSchema(dryWasteSales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDryWasteSaleMaterialSchema = createInsertSchema(dryWasteSaleMaterials).omit({
  id: true,
});

// Types for Material & Output Log
export type InsertDailyWasteLog = z.infer<typeof insertDailyWasteLogSchema>;
export type InsertCompostProductionLog = z.infer<typeof insertCompostProductionLogSchema>;
export type InsertDryWasteSale = z.infer<typeof insertDryWasteSaleSchema>;
export type InsertDryWasteSaleMaterial = z.infer<typeof insertDryWasteSaleMaterialSchema>;

export type DailyWasteLog = typeof dailyWasteLog.$inferSelect;
export type CompostProductionLog = typeof compostProductionLog.$inferSelect;
export type DryWasteSale = typeof dryWasteSales.$inferSelect;
export type DryWasteSaleMaterial = typeof dryWasteSaleMaterials.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Pre-Calculated Daily Analytics Tables
// ═══════════════════════════════════════════════════════════════════

// Daily village-level stats — one row per village per day
export const dailyVillageStats = pgTable("daily_village_stats", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  reportDate: date("report_date").notNull(),
  totalHouseholds: integer("total_households").notNull().default(0),
  collectedCount: integer("collected_count").notNull().default(0),
  segregationSum: decimal("segregation_sum", { precision: 10, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_dvs_village_date").on(table.villageId, table.reportDate),
]);

// Daily ward-level stats — one row per village per ward per day
export const dailyWardStats = pgTable("daily_ward_stats", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  reportDate: date("report_date").notNull(),
  wardName: text("ward_name").notNull(),
  totalHouseholds: integer("total_households").notNull().default(0),
  collectedCount: integer("collected_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_dws_unique").on(table.villageId, table.reportDate, table.wardName),
  index("idx_dws_village_date").on(table.villageId, table.reportDate),
]);

// Daily vehicle-level stats — one row per vehicle per village per day
export const dailyVehicleStats = pgTable("daily_vehicle_stats", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  reportDate: date("report_date").notNull(),
  registrationNumber: text("registration_number").notNull(),
  vehicleName: text("vehicle_name").notNull().default(""),
  collectorNames: text("collector_names").notNull().default(""),
  collectedCount: integer("collected_count").notNull().default(0),
  firstCollectionAt: timestamp("first_collection_at"),
  lastCollectionAt: timestamp("last_collection_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_dvhs_unique").on(table.villageId, table.reportDate, table.registrationNumber),
  index("idx_dvhs_village_date").on(table.villageId, table.reportDate),
]);

// Daily hourly stats — one row per vehicle per hour per village per day
export const dailyHourlyStats = pgTable("daily_hourly_stats", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  reportDate: date("report_date").notNull(),
  hour: integer("hour").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  collectionCount: integer("collection_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_dhs_unique").on(table.villageId, table.reportDate, table.hour, table.vehicleName),
  index("idx_dhs_village_date").on(table.villageId, table.reportDate),
]);

// Insert schemas for Daily Analytics
export const insertDailyVillageStatsSchema = createInsertSchema(dailyVillageStats).omit({ id: true, updatedAt: true });
export const insertDailyWardStatsSchema = createInsertSchema(dailyWardStats).omit({ id: true, updatedAt: true });
export const insertDailyVehicleStatsSchema = createInsertSchema(dailyVehicleStats).omit({ id: true, updatedAt: true });
export const insertDailyHourlyStatsSchema = createInsertSchema(dailyHourlyStats).omit({ id: true, updatedAt: true });

// Types for Daily Analytics
export type DailyVillageStats = typeof dailyVillageStats.$inferSelect;
export type DailyWardStats = typeof dailyWardStats.$inferSelect;
export type DailyVehicleStats = typeof dailyVehicleStats.$inferSelect;
export type DailyHourlyStats = typeof dailyHourlyStats.$inferSelect;
export type InsertDailyVillageStats = z.infer<typeof insertDailyVillageStatsSchema>;
export type InsertDailyWardStats = z.infer<typeof insertDailyWardStatsSchema>;
export type InsertDailyVehicleStats = z.infer<typeof insertDailyVehicleStatsSchema>;
export type InsertDailyHourlyStats = z.infer<typeof insertDailyHourlyStatsSchema>;