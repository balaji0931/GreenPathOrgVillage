import {
    qrCodes,
    households,
    type QRCode,
    type InsertQRCode,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, sql } from "drizzle-orm";

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
    const result = await db.execute(
        sql`SELECT COALESCE(MAX(
            CAST(SUBSTRING(uid FROM 'H([0-9]+)$') AS INTEGER)
        ), 0) AS max_num
        FROM (
            SELECT uid FROM households WHERE village_id = ${villageId}
            UNION ALL
            SELECT uid FROM qr_codes WHERE village_id = ${villageId}
        ) combined`
    );
    return Number(result.rows[0]?.max_num) || 0;
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

/** Count total QR codes for a village (lightweight, no data fetch) */
export async function getQRCodeCountByVillage(villageId: string): Promise<number> {
    const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(qrCodes)
        .where(eq(qrCodes.villageId, villageId));
    return result?.count || 0;
}

/** Get all unmapped QR codes across all batches for a village */
export async function getUnmappedQRCodesByVillage(villageId: string): Promise<QRCode[]> {
    return await db
        .select()
        .from(qrCodes)
        .where(sql`${qrCodes.villageId} = ${villageId} AND ${qrCodes.status} = 'notMapped'`)
        .orderBy(qrCodes.uid);
}

/** Get unmapped QR codes for a specific batch */
export async function getUnmappedQRCodesByBatch(batchId: string): Promise<QRCode[]> {
    return await db
        .select()
        .from(qrCodes)
        .where(sql`${qrCodes.batchId} = ${batchId} AND ${qrCodes.status} = 'notMapped'`)
        .orderBy(qrCodes.uid);
}
