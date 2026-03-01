import {
  websiteFeedback,
  contactSubmissions,
  type WebsiteFeedback,
  type ContactSubmission,
  type InsertWebsiteFeedback,
  type InsertContactSubmission,
} from "@shared/schema";
import { db } from "../db";
import { desc } from "drizzle-orm";

// Website feedback operations
export async function createWebsiteFeedback(insertFeedback: InsertWebsiteFeedback): Promise<WebsiteFeedback> {
  const [feedback] = await db
    .insert(websiteFeedback)
    .values(insertFeedback)
    .returning();
  return feedback;
}

export async function getWebsiteFeedbacks(): Promise<WebsiteFeedback[]> {
  return await db
    .select()
    .from(websiteFeedback)
    .orderBy(desc(websiteFeedback.createdAt));
}

// Contact submissions operations
export async function createContactSubmission(insertContact: InsertContactSubmission): Promise<ContactSubmission> {
  const [contact] = await db
    .insert(contactSubmissions)
    .values(insertContact)
    .returning();
  return contact;
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  return await db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt));
}
