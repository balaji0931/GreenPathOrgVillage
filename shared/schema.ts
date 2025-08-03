import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, date, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Villages table
export const villages = pgTable("villages", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().unique(), // V001, V002, etc.
  name: text("name").notNull(),
  paymentLink: text("payment_link"), // UPI payment link
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }), // Monthly fee amount
  paymentsEnabled: boolean("payments_enabled").default(false), // Enable/disable payments for village
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  month: text("month").notNull(), // Format: YYYY-MM
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("due"), // due, verification_pending, paid
  paymentProofUrl: text("payment_proof_url"), // Image URL for payment proof
  submittedAt: timestamp("submitted_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"), // Manager who verified
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
});

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
  qrCodeUrl: text("qr_code_url"),
  qrCodePublicId: text("qr_code_public_id"),
  qrPrinted: boolean("qr_printed").default(false), // Track if QR code has been printed
  generatorUserId: text("generator_user_id"),
  generatorPassword: text("generator_password"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Waste Collectors
export const collectors = pgTable("collectors", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // V001-C1, V001-C2, etc.
  villageId: text("village_id").notNull().references(() => villages.villageId),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Waste Collections
export const wasteCollections = pgTable("waste_collections", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  collectionDate: timestamp("collection_date").defaultNow(),
  segregationRating: integer("segregation_rating"), // 1-5 stars
  plasticRating: integer("plastic_rating"), // 1-5 stars
  observations: json("observations").$type<string[]>(), // checkboxes
  remarks: text("remarks"),
  photoUrl: text("photo_url"), // only for ratings <= 3
  voiceUrl: text("voice_url"), // voice recording URL
  status: text("status").default("collected"), // collected, missed
  missedReason: text("missed_reason"),
});

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
});

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  targetAudience: text("target_audience").notNull(), // all, managers, generators
  villageId: text("village_id").references(() => villages.villageId), // null for global
  createdBy: text("created_by").notNull(), // UID of creator
  photoUrl: text("photo_url"), // Optional image URL from Cloudinary
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback (from generators to collectors for specific collections)
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  fromHouseholdId: integer("from_household_id").notNull().references(() => households.id),
  toCollectorId: integer("to_collector_id").notNull().references(() => collectors.id),
  rating: integer("rating").notNull(), // 1-5 stars
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const villagesRelations = relations(villages, ({ many }) => ({
  users: many(users),
  households: many(households),
  collectors: many(collectors),
  issues: many(issues),
  payments: many(payments),
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
  payments: many(payments),
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

export const paymentsRelations = relations(payments, ({ one }) => ({
  household: one(households, {
    fields: [payments.householdId],
    references: [households.id],
  }),
  village: one(villages, {
    fields: [payments.villageId],
    references: [villages.villageId],
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

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertModerator = z.infer<typeof insertModeratorSchema>;
export type InsertModeratorVillageAssignment = z.infer<typeof insertModeratorVillageAssignmentSchema>;
export type InsertWebsiteFeedback = z.infer<typeof insertWebsiteFeedbackSchema>;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export type Village = typeof villages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Collector = typeof collectors.$inferSelect;
export type WasteCollection = typeof wasteCollections.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Moderator = typeof moderators.$inferSelect;
export type ModeratorVillageAssignment = typeof moderatorVillageAssignments.$inferSelect;
export type WebsiteFeedback = typeof websiteFeedback.$inferSelect;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;