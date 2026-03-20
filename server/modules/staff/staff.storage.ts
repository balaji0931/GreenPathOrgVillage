import { db } from "../../db";
import { villageStaff } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function createStaff(data: {
  villageId: string;
  name: string;
  phone?: string;
  staffType: "helper" | "segregator";
  workType?: string;
}) {
  // Auto-generate UID like V001-H1, V001-S1
  const prefix = data.staffType === "helper" ? "H" : "S";
  const existing = await db
    .select({ uid: villageStaff.uid })
    .from(villageStaff)
    .where(and(eq(villageStaff.villageId, data.villageId), eq(villageStaff.staffType, data.staffType)));

  // Find max number
  let maxNum = 0;
  for (const row of existing) {
    const match = row.uid.match(new RegExp(`${prefix}(\\d+)$`));
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
  }

  const uid = `${data.villageId}-${prefix}${maxNum + 1}`;

  const [staff] = await db
    .insert(villageStaff)
    .values({
      uid,
      villageId: data.villageId,
      name: data.name,
      phone: data.phone || null,
      staffType: data.staffType,
      workType: data.workType || null,
    })
    .returning();

  return staff;
}

export async function getStaffByType(villageId: string, staffType: string) {
  return db
    .select()
    .from(villageStaff)
    .where(and(
      eq(villageStaff.villageId, villageId),
      eq(villageStaff.staffType, staffType),
      eq(villageStaff.isActive, true),
    ))
    .orderBy(villageStaff.name);
}

export async function getAllStaff(villageId: string) {
  return db
    .select()
    .from(villageStaff)
    .where(and(eq(villageStaff.villageId, villageId), eq(villageStaff.isActive, true)))
    .orderBy(villageStaff.staffType, villageStaff.name);
}

export async function deleteStaff(id: number) {
  await db
    .update(villageStaff)
    .set({ isActive: false })
    .where(eq(villageStaff.id, id));
}
