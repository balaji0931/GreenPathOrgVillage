import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, date, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Villages table
export const villages = pgTable("villages", {
  id: serial("id").primaryKey(),
  villageId: text("village_id").notNull().unique(), // V001, V002, etc.
  name: text("name").notNull(),
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
  familySize: integer("family_size").default(1),
  address: text("address"),
  status: text("status").default("active"),
  qrCodeUrl: text("qr_code_url"),
  qrCodePublicId: text("qr_code_public_id"),
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
  photoUrl: text("photo_url"),
  managerReply: text("manager_reply"),
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

// Attendance
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  date: timestamp("date").notNull(),
  isPresent: boolean("is_present").default(false),
  startTime: text("start_time"),
  endTime: text("end_time"),
  workHours: real("work_hours"),
  dailyReview: text("daily_review"),
  performanceRating: integer("performance_rating"),
  markedBy: text("marked_by").notNull(), // Manager UID
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

// Segregators (workers who sort waste - no accounts, just tracking)
export const segregators = pgTable("segregators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  villageId: text("village_id").notNull().references(() => villages.villageId),
  phone: text("phone").notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Segregator attendance tracking by managers
export const segregatorAttendance = pgTable("segregator_attendance", {
  id: serial("id").primaryKey(),
  segregatorId: integer("segregator_id").notNull().references(() => segregators.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["present", "absent", "half_day"] }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  workHours: real("work_hours"),
  workRating: integer("work_rating"), // 1-5 rating for daily work
  dailyReview: text("daily_review"), // Manager's review
  remarks: text("remarks"),
  markedBy: text("marked_by").notNull(), // Manager UID
  createdAt: timestamp("created_at").defaultNow(),
});

// Collector complaints from generators
export const collectorComplaints = pgTable("collector_complaints", {
  id: serial("id").primaryKey(),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  householdId: integer("household_id").notNull().references(() => households.id),
  complaint: text("complaint").notNull(),
  status: text("status", { enum: ["open", "investigating", "resolved"] }).default("open"),
  managerResponse: text("manager_response"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Collector tracking sessions
export const collectorTrackingSessions = pgTable("collector_tracking_sessions", {
  id: serial("id").primaryKey(),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  sessionDate: date("session_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: text("status", { enum: ["active", "completed"] }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Collector location tracking
export const collectorLocationTracking = pgTable("collector_location_tracking", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => collectorTrackingSessions.id),
  collectorId: integer("collector_id").notNull().references(() => collectors.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: real("accuracy"), // GPS accuracy in meters
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

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
  attendance: many(attendance),
  feedback: many(feedback),
  complaints: many(collectorComplaints),
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

export const attendanceRelations = relations(attendance, ({ one }) => ({
  collector: one(collectors, {
    fields: [attendance.collectorId],
    references: [collectors.id],
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

export const segregatorsRelations = relations(segregators, ({ one, many }) => ({
  village: one(villages, {
    fields: [segregators.villageId],
    references: [villages.villageId],
  }),
  attendance: many(segregatorAttendance),
}));

export const segregatorAttendanceRelations = relations(segregatorAttendance, ({ one }) => ({
  segregator: one(segregators, {
    fields: [segregatorAttendance.segregatorId],
    references: [segregators.id],
  }),
}));

export const collectorComplaintsRelations = relations(collectorComplaints, ({ one }) => ({
  collector: one(collectors, {
    fields: [collectorComplaints.collectorId],
    references: [collectors.id],
  }),
  household: one(households, {
    fields: [collectorComplaints.householdId],
    references: [households.id],
  }),
}));

export const collectorTrackingSessionsRelations = relations(collectorTrackingSessions, ({ one, many }) => ({
  collector: one(collectors, {
    fields: [collectorTrackingSessions.collectorId],
    references: [collectors.id],
  }),
  locationTracking: many(collectorLocationTracking),
}));

export const collectorLocationTrackingRelations = relations(collectorLocationTracking, ({ one }) => ({
  session: one(collectorTrackingSessions, {
    fields: [collectorLocationTracking.sessionId],
    references: [collectorTrackingSessions.id],
  }),
  collector: one(collectors, {
    fields: [collectorLocationTracking.collectorId],
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

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertSegregatorSchema = createInsertSchema(segregators).omit({
  id: true,
  createdAt: true,
});

export const insertSegregatorAttendanceSchema = createInsertSchema(segregatorAttendance).omit({
  id: true,
  createdAt: true,
});

export const insertCollectorComplaintSchema = createInsertSchema(collectorComplaints).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertCollectorTrackingSessionSchema = createInsertSchema(collectorTrackingSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCollectorLocationTrackingSchema = createInsertSchema(collectorLocationTracking).omit({
  id: true,
  timestamp: true,
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

// Types
export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type InsertCollector = z.infer<typeof insertCollectorSchema>;
export type InsertWasteCollection = z.infer<typeof insertWasteCollectionSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type InsertSegregator = z.infer<typeof insertSegregatorSchema>;
export type InsertSegregatorAttendanceType = z.infer<typeof insertSegregatorAttendanceSchema>;
export type InsertCollectorComplaintType = z.infer<typeof insertCollectorComplaintSchema>;
export type InsertModerator = z.infer<typeof insertModeratorSchema>;
export type InsertModeratorVillageAssignment = z.infer<typeof insertModeratorVillageAssignmentSchema>;
export type InsertCollectorTrackingSession = z.infer<typeof insertCollectorTrackingSessionSchema>;
export type InsertCollectorLocationTracking = z.infer<typeof insertCollectorLocationTrackingSchema>;

export type Village = typeof villages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Collector = typeof collectors.$inferSelect;
export type WasteCollection = typeof wasteCollections.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Segregator = typeof segregators.$inferSelect;
export type SegregatorAttendance = typeof segregatorAttendance.$inferSelect;
export type CollectorComplaint = typeof collectorComplaints.$inferSelect;
export type Moderator = typeof moderators.$inferSelect;
export type ModeratorVillageAssignment = typeof moderatorVillageAssignments.$inferSelect;
export type CollectorTrackingSession = typeof collectorTrackingSessions.$inferSelect;
export type CollectorLocationTracking = typeof collectorLocationTracking.$inferSelect;