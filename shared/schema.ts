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
}));

export const collectorsRelations = relations(collectors, ({ one, many }) => ({
  village: one(villages, {
    fields: [collectors.villageId],
    references: [villages.villageId],
  }),
  wasteCollections: many(wasteCollections),
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





// Types
export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type InsertCollector = z.infer<typeof insertCollectorSchema>;
export type InsertWasteCollection = z.infer<typeof insertWasteCollectionSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type Village = typeof villages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Collector = typeof collectors.$inferSelect;
export type WasteCollection = typeof wasteCollections.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;