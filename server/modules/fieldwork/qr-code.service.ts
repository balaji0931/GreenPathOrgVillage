import { storage } from "../../storage";

/**
 * Create a batch of pre-mapped QR codes for a village.
 * No Cloudinary — just creates DB rows with UIDs.
 * 500 codes: ~200ms (single DB insert).
 */
export async function createBatchQRCodes(villageId: string, quantity: number) {
    if (!quantity || quantity < 1 || quantity > 500) {
        throw new Error("Quantity must be between 1 and 500");
    }

    // Get next batch ID and UIDs
    const batchId = await storage.getNextBatchId(villageId);
    const uids = await storage.getNextQRCodeUid(villageId, quantity);

    // No Cloudinary upload — just create DB records with UIDs
    const qrCodeRecords = uids.map(uid => ({
        uid,
        villageId,
        batchId,
        status: 'notMapped',
    }));

    // Single bulk insert
    const savedQRCodes = await storage.createBatchQRCodes(qrCodeRecords);

    return {
        batchId,
        count: savedQRCodes.length,
        qrCodes: savedQRCodes,
    };
}

/**
 * Validate QR code access for a village.
 */
export async function validateQRAccess(uid: string, villageId: string) {
    const { toFullUid } = await import('./qr-service');
    const fullUid = toFullUid(uid);

    const qrCode = await storage.getQRCodeByUid(fullUid);
    if (!qrCode) {
        throw new Error("QR code not found");
    }

    // Ensure the QR belongs to fieldworker's village
    if (qrCode.villageId !== villageId) {
        throw new Error("Access denied");
    }

    return qrCode;
}

/**
 * Map a QR code to a new household.
 */
export async function mapQRToHousehold(
    uid: string,
    villageId: string,
    data: {
        headName: string;
        phone: string;
        houseNumber: string;
        ward?: string;
        householdType?: string;
        familySize?: number;
        address?: string;
        latitude?: number;
        longitude?: number;
    }
) {
    const { headName, phone, houseNumber, ward, householdType, familySize, address, latitude, longitude } = data;

    const { toFullUid, generateGeneratorCredentials } = await import('./qr-service');
    const fullUid = toFullUid(uid);

    // Get the QR code
    const qrCode = await storage.getQRCodeByUid(fullUid);
    if (!qrCode) {
        throw new Error("QR code not found");
    }

    // Ensure QR belongs to fieldworker's village
    if (qrCode.villageId !== villageId) {
        throw new Error("Access denied");
    }

    // Check if already mapped
    if (qrCode.status === 'mapped') {
        throw new Error("QR code is already mapped to a household");
    }

    // The household UID is the same as the full QR UID (GEN-V001-H0001)
    const householdUid = fullUid.replace('GEN-', '');

    // Generate generator credentials (async bcrypt)
    const { userId: generatorUserId, hashedPassword } = await generateGeneratorCredentials(householdUid);

    // Create household — no qrCodeUrl/qrCodePublicId needed
    const household = await storage.createHousehold({
        uid: householdUid,
        villageId,
        headName,
        phone,
        houseNumber,
        ward: ward || 'Ward-1',
        householdType: householdType || 'residential_small',
        familySize: familySize || 1,
        address,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        status: 'active',
        qrPrinted: true,
        generatorUserId,
        generatorPassword: generatorUserId,
    });

    // Create generator user account
    await storage.createUser({
        userId: generatorUserId,
        password: hashedPassword,
        role: 'generator',
        name: headName,
        phone,
        villageId,
    });

    // Update QR code status to mapped
    await storage.updateQRCodeStatus(fullUid, 'mapped', household.id);

    return {
        household,
        credentials: {
            userId: generatorUserId,
        },
    };
}

/**
 * Generate PDF for a batch of QR codes.
 * QR images are generated locally — no Cloudinary fetch.
 */
export async function generateBatchPDF(batchId: string) {
    const qrCodes = await storage.getQRCodesByBatch(batchId);

    if (qrCodes.length === 0) {
        throw new Error("Batch not found");
    }

    const { generatePreMappedQRCodesPDF } = await import('./qr-service');
    const pdfBuffer = await generatePreMappedQRCodesPDF(qrCodes);

    return pdfBuffer;
}
