import { storage } from "../../storage";

/**
 * Generate a unique household UID with retry loop for race conditions.
 * Verbatim extraction from household.routes.ts POST /api/households
 */
export async function generateUniqueHouseholdUid(villageId: string): Promise<string> {
    let maxNum = await storage.getMaxHouseNumber(villageId);
    let counter = maxNum + 1;
    let uid = `${villageId}-H${String(counter).padStart(4, '0')}`;

    // Retry loop to handle race conditions
    while (counter <= 9999) {
        const existingHousehold = await storage.getHouseholdByUid(uid);
        const existingQR = await storage.getQRCodeByUid(uid);
        if (!existingHousehold && !existingQR) break;
        counter++;
        uid = `${villageId}-H${String(counter).padStart(4, '0')}`;
    }

    if (counter > 9999) {
        throw new Error("Maximum households reached for this village");
    }

    return uid;
}

/**
 * Create a single household with QR code and generator user account.
 * Verbatim extraction from household.routes.ts POST /api/households
 */
export async function createHouseholdWithQR(data: {
    villageId: string;
    headName: string;
    phone: string;
    houseNumber: string;
    familySize: number;
    address: string;
    ward?: string;
}) {
    const { villageId, headName, phone, houseNumber, familySize, address, ward } = data;

    const uid = await generateUniqueHouseholdUid(villageId);

    // Generate generator credentials
    const { generateGeneratorCredentials, generateHouseholdQR } = await import('../fieldwork/qr-service');
    const { userId: generatorUserId, password: generatorPassword, hashedPassword } =
        generateGeneratorCredentials(uid);

    // Create household first
    const household = await storage.createHousehold({
        uid,
        villageId,
        headName,
        phone,
        houseNumber,
        ward: ward || 'Ward-1',
        familySize,
        address,
        generatorUserId,
        generatorPassword: hashedPassword,
    });

    // Generate QR code
    const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
        uid,
        headName,
        houseNumber,
        villageId,
        generatorUserId,
    });

    // Update household with QR code info
    await storage.updateHousehold(household.id, {
        qrCodeUrl,
        qrCodePublicId,
    });

    // Create generator user account
    await storage.createUser({
        userId: generatorUserId,
        password: hashedPassword,
        role: 'generator',
        villageId,
        name: `Generator - ${headName}`,
        phone,
        isFirstLogin: true,
    });

    return {
        household: { ...household, qrCodeUrl, qrCodePublicId },
        generatorCredentials: {
            userId: generatorUserId,
            password: generatorPassword,
        },
    };
}

/**
 * Create households in bulk with QR codes.
 * Verbatim extraction from household.routes.ts POST /api/households/bulk
 */
export async function createBulkHouseholds(
    villageId: string,
    householdsData: Array<{
        headName: string;
        houseNumber: string;
        phone: string;
        ward?: string;
        familySize?: number;
        address?: string;
    }>
) {
    if (!Array.isArray(householdsData) || householdsData.length === 0) {
        throw new Error('Invalid households data');
    }

    const createdHouseholds = [];
    const { generateGeneratorCredentials, generateHouseholdQR } = await import('../fieldwork/qr-service');

    // Get max house number at the start (from both tables)
    let currentMaxNum = await storage.getMaxHouseNumber(villageId);

    for (const householdData of householdsData) {
        try {
            // Generate unique UID by incrementing from max with uniqueness check
            currentMaxNum++;
            let counter = currentMaxNum;
            let uid = `${villageId}-H${String(counter).padStart(4, '0')}`;

            // Ensure UID is actually unique (handles race conditions)
            while (counter <= 9999) {
                const existingHousehold = await storage.getHouseholdByUid(uid);
                const existingQR = await storage.getQRCodeByUid(uid);
                if (!existingHousehold && !existingQR) break;
                counter++;
                uid = `${villageId}-H${String(counter).padStart(4, '0')}`;
            }
            currentMaxNum = counter; // Update for next iteration

            if (counter > 9999) {
                console.error(`Maximum households reached for village ${villageId}`);
                continue; // Skip this household
            }

            // Generate generator credentials
            const { userId: generatorUserId, password: generatorPassword, hashedPassword } =
                generateGeneratorCredentials(uid);

            // Create household
            const household = await storage.createHousehold({
                uid,
                villageId,
                headName: householdData.headName,
                houseNumber: householdData.houseNumber,
                phone: householdData.phone,
                ward: householdData.ward || 'Ward-1',
                familySize: householdData.familySize || 1,
                address: householdData.address || '',
                generatorUserId,
                generatorPassword: hashedPassword,
            });

            // Generate QR code
            const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
                uid,
                headName: household.headName,
                houseNumber: household.houseNumber || '',
                villageId,
                generatorUserId,
            });

            // Update household with QR code URL
            const updatedHousehold = await storage.updateHousehold(household.id, {
                qrCodeUrl,
                qrCodePublicId,
            });

            // Create generator user account
            await storage.createUser({
                userId: generatorUserId,
                password: hashedPassword,
                role: 'generator',
                villageId,
                name: `Generator - ${household.headName}`,
                phone: household.phone,
                isFirstLogin: true,
            });

            createdHouseholds.push({
                ...updatedHousehold,
                generatorCredentials: {
                    userId: generatorUserId,
                    password: generatorPassword,
                }
            });
        } catch (error: any) {
            console.error(`Error creating household ${householdData.headName}:`, error);
            // Continue with next household instead of failing entire batch
        }
    }

    return createdHouseholds;
}

/**
 * Generate QR codes for existing households that don't have them.
 * Verbatim extraction from household.routes.ts POST /api/qr-codes/generate
 */
export async function generateQRCodesForExisting(villageId: string, householdIds: number[]) {
    if (!Array.isArray(householdIds) || householdIds.length === 0) {
        throw new Error('Invalid household IDs');
    }

    const { generateHouseholdQR } = await import('../fieldwork/qr-service');
    const updatedHouseholds = [];

    for (const householdId of householdIds) {
        const household = await storage.getHouseholdsByVillage(villageId);
        const targetHousehold = household.find(h => h.id === householdId);

        if (!targetHousehold) {
            continue;
        }

        // Skip if QR code already exists
        if (targetHousehold.qrCodeUrl) {
            continue;
        }

        // Generate QR code
        const { qrCodeUrl, qrCodePublicId } = await generateHouseholdQR({
            uid: targetHousehold.uid,
            headName: targetHousehold.headName,
            houseNumber: targetHousehold.houseNumber || '',
            villageId: targetHousehold.villageId,
            generatorUserId: targetHousehold.generatorUserId || '',
        });

        // Update household with QR code
        const updated = await storage.updateHousehold(householdId, {
            qrCodeUrl,
            qrCodePublicId,
        });

        updatedHouseholds.push(updated);
    }

    return updatedHouseholds;
}

/**
 * Generate a PDF of QR codes for selected households.
 * Verbatim extraction from household.routes.ts POST /api/qr-codes/download-pdf
 */
export async function generateQRCodesPDF(villageId: string, householdIds: number[]) {
    if (!Array.isArray(householdIds) || householdIds.length === 0) {
        throw new Error('Invalid household IDs');
    }

    const households = await storage.getHouseholdsByVillage(villageId);
    const selectedHouseholds = households.filter(h =>
        householdIds.includes(h.id) && h.qrCodeUrl
    ).map(h => ({
        uid: h.uid,
        headName: h.headName,
        houseNumber: h.houseNumber || '',
        villageId: h.villageId,
        qrCodeUrl: h.qrCodeUrl || ''
    }));

    if (selectedHouseholds.length === 0) {
        throw new Error('No households with QR codes found');
    }

    const { generateBulkQRCodesPDF } = await import('../fieldwork/qr-service');
    const pdfBuffer = await generateBulkQRCodesPDF(selectedHouseholds);

    return pdfBuffer;
}
