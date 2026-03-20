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
  weightRequired: boolean("weight_required").default(false), // Manager configures if weight entry is compulsory
  wards: text("wards").array().default([]), // Array of ward names for this village
  locationServicesEnabled: boolean("location_services_enabled").default(false), // Admin setting for location mapping
  paymentsEnabled: boolean("payments_enabled").default(false), // Admin toggle: enable payment/billing features for this village
  attendanceEnabled: boolean("attendance_enabled").default(false), // Admin toggle: enable attendance & shift tracking
  behaviourThresholds: json("behaviour_thresholds").$type<{ minAvgRating: number; maxMixed7Days: number; maxInactiveDays: number }>(), // Manager-configurable thresholds for household monitoring
  vehicles: json("vehicles").$type<{ registrationNumber: string; name: string; collectorIds: number[] }[]>().default([]), // Array of vehicles
  totalHouseholds: integer("total_households").notNull().default(0), // Pre-calculated household count
  proximityAlertsEnabled: boolean("proximity_alerts_enabled").default(false), // Admin toggle: enable push notifications for nearby collection
  notificationRadiusMeters: integer("notification_radius_meters").default(150), // Radius for proximity alerts (120-300m)
  notificationWindowStart: text("notification_window_start").default("05:30"), // HH:MM IST — earliest push time
  notificationWindowEnd: text("notification_window_end").default("13:00"), // HH:MM IST — latest push time
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
  householdType: text("household_type").default("residential_small"), // residential_small, residential_large, commercial_shop, bulk_generator, institutional, slum_supported

  qrPrinted: boolean("qr_printed").default(false), // Track if QR code has been printed
  generatorUserId: text("generator_user_id"),
  generatorPassword: text("generator_password"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  remarks: text("remarks"),
  photoUrl: text("photo_url"), // only for ratings <= 3
  voiceUrl: text("voice_url"), // voice recording URL
  status: text("status").default("collected"), // collected, missed
  missedReason: text("missed_reason"),
  wasteTypes: json("waste_types").$type<string[]>(), // wet, dry, sanitary, special_care, mixed
  weightKg: decimal("weight_kg", { precision: 10, scale: 2 }), // optional weight in kg
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
  organizationName: text("organization_name"),
  organizationType: text("organization_type"),
  estimatedHouseholds: text("estimated_households"),
  state: text("state"),
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
  specialCareWasteKg: decimal("special_care_waste_kg", { precision: 10, scale: 2 }).default("0"),
  specialCareWastePhotoUrl: text("special_care_waste_photo_url"),
  sanitaryWasteKg: decimal("sanitary_waste_kg", { precision: 10, scale: 2 }).default("0"),
  sanitaryWastePhotoUrl: text("sanitary_waste_photo_url"),
  mixedWasteKg: decimal("mixed_waste_kg", { precision: 10, scale: 2 }).default("0"),
  mixedWastePhotoUrl: text("mixed_waste_photo_url"),
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

// ═══════════════════════════════════════════════════════════════════
// Payment Ledger Tables (Phase A1)
// ═══════════════════════════════════════════════════════════════════

// Household type registry — per-village configurable types
export const householdTypes = pgTable("household_types", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  typeCode: text("type_code").notNull(),                     // "residential_small", "commercial_shop", etc.
  displayName: text("display_name").notNull(),               // "Residential (Small)"
  description: text("description"),                          // "1-4 members, small house"
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_ht_village_code").on(table.villageId, table.typeCode),
  index("idx_ht_village").on(table.villageId),
]);

// Fee config — current active fee per type per village
export const villageMonthFeeConfig = pgTable("village_month_fee_config", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  householdTypeCode: text("household_type_code").notNull(),  // matches typeCode in householdTypes
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).notNull(),
  isWaivedCategory: boolean("is_waived_category").default(false),
  createdBy: text("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_fee_village_type").on(table.villageId, table.householdTypeCode),
  index("idx_fee_village").on(table.villageId),
]);

// Billing cycles — governance lock per village per month
export const billingCycles = pgTable("billing_cycles", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  billingMonth: text("billing_month").notNull(),              // "2026-04"
  status: text("status").default("active"),                   // active | closed
  totalBillsGenerated: integer("total_bills_generated").default(0),
  totalExpectedRevenue: decimal("total_expected_revenue", { precision: 12, scale: 2 }),
  totalWaivedHouseholds: integer("total_waived_households").default(0),
  feeConfigSnapshot: json("fee_config_snapshot").$type<{
    typeCode: string;
    displayName: string;
    feeAmount: string;
    isWaived: boolean;
    householdCount: number;
  }[]>(),
  gatewayConfigSnapshot: json("gateway_config_snapshot").$type<{
    provider: string;
    configVersionHash: string;
    merchantLabel: string;
    isTestMode: boolean;
    mdrPolicy: string;
  } | null>(),
  activatedAt: timestamp("activated_at").defaultNow(),
  activatedBy: text("activated_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_cycle_village_month").on(table.villageId, table.billingMonth),
  index("idx_cycle_village").on(table.villageId),
]);

// Household monthly bills — the ledger register (one row = one bill = one payment)
export const householdMonthlyBills = pgTable("household_monthly_bills", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  billingMonth: text("billing_month").notNull(),
  cycleId: integer("cycle_id").notNull().references(() => billingCycles.id),

  // Snapshot at generation time
  householdTypeSnapshot: text("household_type_snapshot").notNull(),
  feeAmountSnapshot: decimal("fee_amount_snapshot", { precision: 10, scale: 2 }).notNull(),

  // Status (BINARY — no partial)
  status: text("status").default("unpaid"),                   // unpaid | paid | waived

  // Payment fields (filled when paid)
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),                      // cash | gateway_upi_qr | gateway_inapp
  gatewayTxnId: text("gateway_txn_id"),
  receivedByUserId: text("received_by_user_id"),
  receiptNumber: text("receipt_number"),

  // Waiver fields (filled when waived)
  waivedReason: text("waived_reason"),
  waivedBy: text("waived_by"),

  // Payment lock — prevents duplicate gateway orders
  isLockedForPayment: boolean("is_locked_for_payment").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_bill_household_month").on(table.householdId, table.billingMonth),
  index("idx_bill_village_month_status").on(table.villageId, table.billingMonth, table.status),
  index("idx_bill_cycle").on(table.cycleId),
  uniqueIndex("idx_bill_gateway_txn").on(table.gatewayTxnId),
]);

// Payment gateway config — provider-agnostic, village-owned
export const villagePaymentGatewayConfig = pgTable("village_payment_gateway_config", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  provider: text("provider").notNull(),                       // razorpay | cashfree | payU
  encryptedConfigJson: text("encrypted_config_json"),         // AES-256-GCM — all credentials + signature_key inside
  mdrPolicy: text("mdr_policy").default("village_absorbs"),   // village_absorbs | household_pays
  mdrPercentage: decimal("mdr_percentage", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(false),
  isTestMode: boolean("is_test_mode").default(false),
  successRateLast30Days: decimal("success_rate_last_30_days", { precision: 5, scale: 2 }),
  avgWebhookLatencyMs: integer("avg_webhook_latency_ms"),
  lastVerifiedAt: timestamp("last_verified_at"),
  lastTestStatus: text("last_test_status"),                   // success | failed
  configuredBy: text("configured_by").notNull(),              // manager userId
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gateway_village").on(table.villageId),
  // Note: partial unique index (only one active per village) must be created via raw SQL migration:
  // CREATE UNIQUE INDEX idx_one_active_gateway ON village_payment_gateway_config(village_id) WHERE is_active = true;
]);

// Payment gateway orders — backend-owned order→bill mapping (never rely on gateway metadata)
export const paymentGatewayOrders = pgTable("payment_gateway_orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),               // gateway order ID
  villageId: text("village_id").notNull().references(() => villages.villageId),
  provider: text("provider").notNull(),
  billIds: json("bill_ids").$type<number[]>().notNull(),      // [101, 102, 103]
  billAmounts: json("bill_amounts").$type<number[]>().notNull(), // [100, 100, 150]
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  mdrAmount: decimal("mdr_amount", { precision: 10, scale: 2 }).default("0"),
  chargeableAmount: decimal("chargeable_amount", { precision: 12, scale: 2 }).notNull(), // rounded half-up
  method: text("method").notNull(),                           // gateway_upi_qr | gateway_inapp
  status: text("status").default("pending"),                  // pending | captured | failed | expired
  expiresAt: timestamp("expires_at"),                         // 5 min from creation
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_orders_status").on(table.status),
  index("idx_orders_village").on(table.villageId),
]);

// Payment gateway events — webhook audit trail (idempotent processing)
export const paymentGatewayEvents = pgTable("payment_gateway_events", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),                    // payment.captured, payment.failed
  orderId: text("order_id"),                                  // links to payment_gateway_orders
  gatewayTxnId: text("gateway_txn_id").notNull(),
  amountPaise: integer("amount_paise"),
  rawPayload: json("raw_payload"),                            // full webhook body
  webhookLatencyMs: integer("webhook_latency_ms"),            // webhook_received_at - order.createdAt
  status: text("status").default("processed"),                // processed | ignored | duplicate | failed
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Scoped uniqueness: prevents cross-provider collision
  uniqueIndex("idx_gateway_event_idempotency").on(table.villageId, table.provider, table.gatewayTxnId),
  index("idx_gateway_event_order").on(table.orderId),
]);

// Payment audit log — forensic action trail
export const paymentAuditLog = pgTable("payment_audit_log", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => householdMonthlyBills.id),
  action: text("action").notNull(),                           // marked_paid | undone | waived | bulk_paid
  performedBy: text("performed_by").notNull(),                // userId
  details: json("details").$type<Record<string, any>>(),      // method, receipt, previous state, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_bill").on(table.billId),
  index("idx_audit_action").on(table.action),
]);

// Receipt counters — concurrency-safe sequential receipt numbering per village+month
export const receiptCounters = pgTable("receipt_counters", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  billingMonth: text("billing_month").notNull(),              // "2026-04"
  lastSequence: integer("last_sequence").default(0),
}, (table) => [
  uniqueIndex("idx_receipt_village_month").on(table.villageId, table.billingMonth),
]);

// ── Payment Ledger Relations ──

export const householdTypesRelations = relations(householdTypes, ({ one }) => ({
  village: one(villages, {
    fields: [householdTypes.villageId],
    references: [villages.villageId],
  }),
}));

export const villageMonthFeeConfigRelations = relations(villageMonthFeeConfig, ({ one }) => ({
  village: one(villages, {
    fields: [villageMonthFeeConfig.villageId],
    references: [villages.villageId],
  }),
}));

export const billingCyclesRelations = relations(billingCycles, ({ one, many }) => ({
  village: one(villages, {
    fields: [billingCycles.villageId],
    references: [villages.villageId],
  }),
  bills: many(householdMonthlyBills),
}));

export const householdMonthlyBillsRelations = relations(householdMonthlyBills, ({ one, many }) => ({
  household: one(households, {
    fields: [householdMonthlyBills.householdId],
    references: [households.id],
  }),
  village: one(villages, {
    fields: [householdMonthlyBills.villageId],
    references: [villages.villageId],
  }),
  cycle: one(billingCycles, {
    fields: [householdMonthlyBills.cycleId],
    references: [billingCycles.id],
  }),
  auditLogs: many(paymentAuditLog),
}));

export const villagePaymentGatewayConfigRelations = relations(villagePaymentGatewayConfig, ({ one }) => ({
  village: one(villages, {
    fields: [villagePaymentGatewayConfig.villageId],
    references: [villages.villageId],
  }),
}));

export const paymentGatewayOrdersRelations = relations(paymentGatewayOrders, ({ one }) => ({
  village: one(villages, {
    fields: [paymentGatewayOrders.villageId],
    references: [villages.villageId],
  }),
}));

export const paymentAuditLogRelations = relations(paymentAuditLog, ({ one }) => ({
  bill: one(householdMonthlyBills, {
    fields: [paymentAuditLog.billId],
    references: [householdMonthlyBills.id],
  }),
}));

// ── Payment Ledger Insert Schemas ──

export const insertHouseholdTypeSchema = createInsertSchema(householdTypes).omit({
  id: true,
  createdAt: true,
});

export const insertVillageMonthFeeConfigSchema = createInsertSchema(villageMonthFeeConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertBillingCycleSchema = createInsertSchema(billingCycles).omit({
  id: true,
  createdAt: true,
  activatedAt: true,
});

export const insertHouseholdMonthlyBillSchema = createInsertSchema(householdMonthlyBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVillagePaymentGatewayConfigSchema = createInsertSchema(villagePaymentGatewayConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentGatewayOrderSchema = createInsertSchema(paymentGatewayOrders).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentGatewayEventSchema = createInsertSchema(paymentGatewayEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentAuditLogSchema = createInsertSchema(paymentAuditLog).omit({
  id: true,
  createdAt: true,
});

// ── Payment Ledger Types ──

export type HouseholdType = typeof householdTypes.$inferSelect;
export type VillageMonthFeeConfig = typeof villageMonthFeeConfig.$inferSelect;
export type BillingCycle = typeof billingCycles.$inferSelect;
export type HouseholdMonthlyBill = typeof householdMonthlyBills.$inferSelect;
export type VillagePaymentGatewayConfig = typeof villagePaymentGatewayConfig.$inferSelect;
export type PaymentGatewayOrder = typeof paymentGatewayOrders.$inferSelect;
export type PaymentGatewayEvent = typeof paymentGatewayEvents.$inferSelect;
export type PaymentAuditLog = typeof paymentAuditLog.$inferSelect;
export type ReceiptCounter = typeof receiptCounters.$inferSelect;

export type InsertHouseholdType = z.infer<typeof insertHouseholdTypeSchema>;
export type InsertVillageMonthFeeConfig = z.infer<typeof insertVillageMonthFeeConfigSchema>;
export type InsertBillingCycle = z.infer<typeof insertBillingCycleSchema>;
export type InsertHouseholdMonthlyBill = z.infer<typeof insertHouseholdMonthlyBillSchema>;
export type InsertVillagePaymentGatewayConfig = z.infer<typeof insertVillagePaymentGatewayConfigSchema>;
export type InsertPaymentGatewayOrder = z.infer<typeof insertPaymentGatewayOrderSchema>;
export type InsertPaymentGatewayEvent = z.infer<typeof insertPaymentGatewayEventSchema>;
export type InsertPaymentAuditLog = z.infer<typeof insertPaymentAuditLogSchema>;

// ═══════════════════════════════════════════════════════════════════
// Audit Log Table (A6 — Important Actions Only)
// ═══════════════════════════════════════════════════════════════════

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").references(() => villages.villageId),
  userId: text("user_id").notNull(),                           // who performed the action
  action: text("action").notNull(),                            // created | updated | deleted | accepted | rejected | activated | deactivated | reset_password | mapped
  entity: text("entity").notNull(),                            // household | collector | fieldworker | village | village_settings | bill | billing_cycle | fee_config | gateway_config | qr_batch | qr_mapping | vehicle | issue | announcement
  entityId: text("entity_id"),                                 // ID of the affected entity
  details: json("details").$type<Record<string, any>>(),       // contextual info: before/after, reason, names, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_village_created").on(table.villageId, table.createdAt),
  index("idx_audit_entity").on(table.entity, table.entityId),
  index("idx_audit_user").on(table.userId),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  village: one(villages, {
    fields: [auditLogs.villageId],
    references: [villages.villageId],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ═══════════════════════════════════════════════════════════════════
// Attendance & Shift Log Tables (Layer-1 Operations)
// ═══════════════════════════════════════════════════════════════════

// Attendance Centers — locations where collectors scan QR to start/end shift
export const attendanceCenters = pgTable("attendance_centers", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  name: text("name").notNull(),                                   // "Main Depot", "Ward-2 Office"
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(200),   // Geo-fence radius
  qrToken: text("qr_token").notNull().unique(),                    // UUID in printed QR poster
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_att_centers_village").on(table.villageId),
]);

// Shift Logs — collector scans QR + GPS to start/end shifts (multiple per day)
export const shiftLogs = pgTable("shift_logs", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  workerId: text("worker_id").notNull(),                           // user uid (collector)
  workerName: text("worker_name").notNull(),                       // denormalized
  shiftDate: date("shift_date").notNull(),                         // IST date
  shiftNumber: integer("shift_number").notNull().default(1),       // 1, 2, 3... for multiple shifts/day
  eventType: text("event_type").notNull(),                         // shift_start | shift_end
  markedAt: timestamp("marked_at").notNull(),                      // when scanned
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  distanceFromCenter: integer("distance_from_center"),             // meters
  attendanceCenterId: integer("attendance_center_id").references(() => attendanceCenters.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shift_village_date").on(table.villageId, table.shiftDate),
  index("idx_shift_worker_date").on(table.workerId, table.shiftDate),
]);

// Worker Attendance — manager-marked daily attendance
export const workerAttendance = pgTable("worker_attendance", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  workerId: text("worker_id").notNull(),                           // user uid
  workerName: text("worker_name").notNull(),                       // denormalized
  attendanceDate: date("attendance_date").notNull(),                // IST date
  status: text("status").notNull(),                                // present | half_day | absent
  markedByUserId: text("marked_by_user_id").notNull(),             // manager who marked
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_att_worker_date").on(table.villageId, table.workerId, table.attendanceDate),
  index("idx_att_village_date").on(table.villageId, table.attendanceDate),
]);

// Relations
export const attendanceCentersRelations = relations(attendanceCenters, ({ one }) => ({
  village: one(villages, {
    fields: [attendanceCenters.villageId],
    references: [villages.villageId],
  }),
}));

export const shiftLogsRelations = relations(shiftLogs, ({ one }) => ({
  village: one(villages, {
    fields: [shiftLogs.villageId],
    references: [villages.villageId],
  }),
  center: one(attendanceCenters, {
    fields: [shiftLogs.attendanceCenterId],
    references: [attendanceCenters.id],
  }),
}));

export const workerAttendanceRelations = relations(workerAttendance, ({ one }) => ({
  village: one(villages, {
    fields: [workerAttendance.villageId],
    references: [villages.villageId],
  }),
}));

// Insert schemas
export const insertAttendanceCenterSchema = createInsertSchema(attendanceCenters).omit({ id: true, createdAt: true });
export const insertShiftLogSchema = createInsertSchema(shiftLogs).omit({ id: true, createdAt: true });
export const insertWorkerAttendanceSchema = createInsertSchema(workerAttendance).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type AttendanceCenter = typeof attendanceCenters.$inferSelect;
export type ShiftLog = typeof shiftLogs.$inferSelect;
export type WorkerAttendance = typeof workerAttendance.$inferSelect;
export type InsertAttendanceCenter = z.infer<typeof insertAttendanceCenterSchema>;
export type InsertShiftLog = z.infer<typeof insertShiftLogSchema>;
export type InsertWorkerAttendance = z.infer<typeof insertWorkerAttendanceSchema>;

// ═══════════════════════════════════════════
// Household Behaviour Stats (pre-computed)
// ═══════════════════════════════════════════
export const householdBehaviourStats = pgTable("household_behaviour_stats", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  householdId: integer("household_id").notNull().references(() => households.id),
  ward: text("ward").notNull().default("Ward-1"),

  totalCollections: integer("total_collections").notNull().default(0),
  collectionsLast7: integer("collections_last_7").notNull().default(0),
  collectionsLast30: integer("collections_last_30").notNull().default(0),
  avgRatingLast10: decimal("avg_rating_last_10", { precision: 3, scale: 1 }),
  mixedCountLast7: integer("mixed_count_last_7").notNull().default(0),
  lastCollectionDate: timestamp("last_collection_date"),
  daysSinceLastCollection: integer("days_since_last_collection"),
  lastCollectionType: text("last_collection_type"), // 'segregated' or 'mixed'

  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_hbs_household").on(table.householdId),
  index("idx_hbs_village").on(table.villageId),
  index("idx_hbs_village_ward").on(table.villageId, table.ward),
]);

// System Jobs (daily refresh guard)
export const systemJobs = pgTable("system_jobs", {
  id: serial("id").primaryKey(),
  jobName: text("job_name").notNull().unique(),
  lastRunDate: date("last_run_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHouseholdBehaviourStatsSchema = createInsertSchema(householdBehaviourStats).omit({ id: true, updatedAt: true });
export type HouseholdBehaviourStats = typeof householdBehaviourStats.$inferSelect;
export type InsertHouseholdBehaviourStats = z.infer<typeof insertHouseholdBehaviourStatsSchema>;

// ═══════════════════════════════════════════
// Village Staff (Helpers & Waste Segregators)
// ═══════════════════════════════════════════
export const villageStaff = pgTable("village_staff", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),                              // V001-H1, V001-S1, etc.
  villageId: text("village_id").notNull().references(() => villages.villageId),
  name: text("name").notNull(),
  phone: text("phone"),
  staffType: text("staff_type").notNull(),                         // "helper" | "segregator"
  workType: text("work_type"),                                     // helper only: compost_helper, sweeper, driver, loader, garden_worker, drain_cleaner
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vstaff_village_type").on(table.villageId, table.staffType),
]);

export const villageStaffRelations = relations(villageStaff, ({ one }) => ({
  village: one(villages, {
    fields: [villageStaff.villageId],
    references: [villages.villageId],
  }),
}));

export const insertVillageStaffSchema = createInsertSchema(villageStaff).omit({ id: true, createdAt: true });
export type VillageStaff = typeof villageStaff.$inferSelect;
export type InsertVillageStaff = z.infer<typeof insertVillageStaffSchema>;

// Push Subscriptions (for proximity collection alerts)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  isActive: boolean("is_active").default(true),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_push_village_active").on(table.villageId, table.isActive),
  index("idx_push_household").on(table.householdId),
]);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  household: one(households, {
    fields: [pushSubscriptions.householdId],
    references: [households.id],
  }),
  village: one(villages, {
    fields: [pushSubscriptions.villageId],
    references: [villages.villageId],
  }),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true, lastNotifiedAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;