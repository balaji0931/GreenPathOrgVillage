import {
    qrCodes,
    households,
    type QRCode,
    type InsertQRCode,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

export async function createQRCode(insertQRCode: InsertQRCode): Promise<QRCode> {
    const [qrCode] = await db
        .insert(qrCodes)
        .values(insertQRCode)
        .returning();
    return qrCode;
}

export async function createBatchQRCodes(insertQRCodes: InsertQRCode[]): Promise<QRCode[]> {
    if (insertQRCodes.length === 0) return [];
    const result = await db
        .insert(qrCodes)
        .values(insertQRCodes)
        .returning();
    return result;
}

export async function getQRCodeByUid(uid: string): Promise<QRCode | undefined> {
    const [qrCode] = await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.uid, uid));
    return qrCode || undefined;
}

export async function getQRCodesByVillage(villageId: string): Promise<QRCode[]> {
    return await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.villageId, villageId))
        .orderBy(desc(qrCodes.createdAt));
}

export async function getQRCodesByBatch(batchId: string): Promise<QRCode[]> {
    return await db
        .select()
        .from(qrCodes)
        .where(eq(qrCodes.batchId, batchId))
        .orderBy(qrCodes.uid);
}

export async function updateQRCodeStatus(uid: string, status: string, householdId?: number): Promise<QRCode> {
    const updateData: Partial<QRCode> = { status };
    if (householdId !== undefined) {
        updateData.householdId = householdId;
    }
    const [qrCode] = await db
        .update(qrCodes)
        .set(updateData)
        .where(eq(qrCodes.uid, uid))
        .returning();
    return qrCode;
}

export async function getNextBatchId(villageId: string): Promise<string> {
    const existingBatches = await db
        .select({ batchId: qrCodes.batchId })
        .from(qrCodes)
        .where(eq(qrCodes.villageId, villageId))
        .groupBy(qrCodes.batchId)
        .orderBy(desc(qrCodes.batchId));

    if (existingBatches.length === 0) {
        return `BATCH-${villageId}-001`;
    }

    const latestBatch = existingBatches[0].batchId;
    const match = latestBatch.match(/BATCH-.*-(\d+)$/);
    if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `BATCH-${villageId}-${String(nextNum).padStart(3, '0')}`;
    }
    return `BATCH-${villageId}-001`;
}

export async function getMaxHouseNumber(villageId: string): Promise<number> {
    const existingHouseholds = await db
        .select({ uid: households.uid })
        .from(households)
        .where(eq(households.villageId, villageId));

    const existingQRCodes = await db
        .select({ uid: qrCodes.uid })
        .from(qrCodes)
        .where(eq(qrCodes.villageId, villageId));

    let maxNum = 0;

    for (const h of existingHouseholds) {
        const match = h.uid.match(/H(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    }

    for (const qr of existingQRCodes) {
        const match = qr.uid.match(/H(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
                maxNum = num;
            }
        }
    }

    return maxNum;
}

export async function getNextQRCodeUid(villageId: string, count: number): Promise<string[]> {
    const maxNum = await getMaxHouseNumber(villageId);

    const startNum = maxNum + 1;
    const uids: string[] = [];
    for (let i = 0; i < count; i++) {
        uids.push(`GEN-${villageId}-H${String(startNum + i).padStart(4, '0')}`);
    }
    return uids;
}
