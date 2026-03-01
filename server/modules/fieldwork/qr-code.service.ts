import { storage } from "../../storage";

/**
 * Create a batch of pre-mapped QR codes for a village.
 * Verbatim extraction from qr-code.routes.ts POST /api/qr-codes/batch
 */
export async function createBatchQRCodes(villageId: string, quantity: number) {
    if (!quantity || quantity < 1 || quantity > 500) {
        throw new Error("Quantity must be between 1 and 500");
    }

    // Get next batch ID and UIDs
    const batchId = await storage.getNextBatchId(villageId);
    const uids = await storage.getNextQRCodeUid(villageId, quantity);

    // Import the QR generation function
    const { generatePreMappedQR } = await import('./qr-service');

    // Generate QR codes and upload to Cloudinary
    const qrCodeRecords = [];
    for (const uid of uids) {
        const { qrCodeUrl, qrCodePublicId } = await generatePreMappedQR(uid, villageId);
        qrCodeRecords.push({
            uid,
            qrCodeUrl,
            qrCodePublicId,
            villageId,
            batchId,
            status: 'notMapped',
        });
    }

    // Save to database
    const savedQRCodes = await storage.createBatchQRCodes(qrCodeRecords);

    return {
        batchId,
        count: savedQRCodes.length,
        qrCodes: savedQRCodes,
    };
}

/**
 * Validate QR code access for a village.
 * Verbatim extraction from qr-code.routes.ts GET /api/qr-codes/:uid
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
 * Verbatim extraction from qr-code.routes.ts POST /api/qr-codes/:uid/map
 */
export async function mapQRToHousehold(
    uid: string,
    villageId: string,
    data: {
        headName: string;
        phone: string;
        houseNumber: string;
        ward?: string;
        familySize?: number;
        address?: string;
        latitude?: number;
        longitude?: number;
    }
) {
    const { headName, phone, houseNumber, ward, familySize, address, latitude, longitude } = data;

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

    // Generate generator credentials (uses the full UID)
    const { userId: generatorUserId, hashedPassword } = generateGeneratorCredentials(householdUid);

    // Create household with qrPrinted = true (since they already have the physical QR)
    const household = await storage.createHousehold({
        uid: householdUid,
        villageId,
        headName,
        phone,
        houseNumber,
        ward: ward || 'Ward-1',
        familySize: familySize || 1,
        address,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        status: 'active',
        qrCodeUrl: qrCode.qrCodeUrl,
        qrCodePublicId: qrCode.qrCodePublicId,
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
            password: generatorUserId,
        },
    };
}

/**
 * Generate PDF for a batch of QR codes.
 * Verbatim extraction from qr-code.routes.ts GET /api/qr-codes/batch/:batchId/pdf
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
