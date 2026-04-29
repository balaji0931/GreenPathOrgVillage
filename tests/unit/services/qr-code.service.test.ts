import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getNextBatchId: jest.fn(),
    getNextQRCodeUid: jest.fn(),
    createBatchQRCodes: jest.fn(),
    getQRCodeByUid: jest.fn(),
    createHousehold: jest.fn(),
    createUser: jest.fn(),
    updateQRCodeStatus: jest.fn(),
    getQRCodesByBatch: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

jest.unstable_mockModule('../../../server/modules/fieldwork/qr-service', () => ({
    generateQRBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-qr') as never),
    generatePreMappedQRCodesPDF: jest.fn().mockResolvedValue(Buffer.from('fake-pdf') as never),
    toFullUid: (uid: string) => uid.startsWith('GEN-') ? uid : `GEN-${uid}`,
    getScannableUid: (uid: string) => uid.replace(/^GEN-/, ''),
    generateGeneratorCredentials: jest.fn().mockResolvedValue({
        userId: 'GEN-V001-0001',
        password: 'GEN-V001-0001',
        hashedPassword: 'hashed-GEN',
    } as never),
}));

const { createBatchQRCodes, validateQRAccess, mapQRToHousehold, generateBatchPDF } =
    await import('../../../server/modules/fieldwork/qr-code.service');

describe('qr-code.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createBatchQRCodes', () => {
        test('creates batch of QR codes (DB only, no Cloudinary)', async () => {
            mockStorage.getNextBatchId.mockResolvedValue('BATCH-V001-001' as never);
            mockStorage.getNextQRCodeUid.mockResolvedValue(['GEN-V001-0001', 'GEN-V001-0002'] as never);
            mockStorage.createBatchQRCodes.mockResolvedValue([
                { uid: 'GEN-V001-0001', batchId: 'BATCH-V001-001' },
                { uid: 'GEN-V001-0002', batchId: 'BATCH-V001-001' },
            ] as never);

            const result = await createBatchQRCodes('V001', 2);
            expect(result.batchId).toBe('BATCH-V001-001');
            expect(result.count).toBe(2);

            // Verify no QR generation/upload calls - pure DB insert
            expect(mockStorage.createBatchQRCodes).toHaveBeenCalledWith([
                { uid: 'GEN-V001-0001', villageId: 'V001', batchId: 'BATCH-V001-001', status: 'notMapped' },
                { uid: 'GEN-V001-0002', villageId: 'V001', batchId: 'BATCH-V001-001', status: 'notMapped' },
            ]);
        });

        test('throws when quantity is 0', async () => {
            await expect(createBatchQRCodes('V001', 0))
                .rejects.toThrow('Quantity must be between 1 and 500');
        });

        test('throws when quantity exceeds 500', async () => {
            await expect(createBatchQRCodes('V001', 501))
                .rejects.toThrow('Quantity must be between 1 and 500');
        });

        test('throws when quantity is negative', async () => {
            await expect(createBatchQRCodes('V001', -1))
                .rejects.toThrow('Quantity must be between 1 and 500');
        });
    });

    describe('validateQRAccess', () => {
        test('returns QR code when valid', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue({
                uid: 'GEN-V001-0001', villageId: 'V001', status: 'notMapped',
            } as never);

            const result = await validateQRAccess('V001-0001', 'V001');
            expect(result.uid).toBe('GEN-V001-0001');
        });

        test('throws when QR not found', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue(null as never);
            await expect(validateQRAccess('INVALID', 'V001'))
                .rejects.toThrow('QR code not found');
        });

        test('throws when village mismatch', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue({
                uid: 'GEN-V001-0001', villageId: 'V001',
            } as never);
            await expect(validateQRAccess('V001-0001', 'V002'))
                .rejects.toThrow('Access denied');
        });
    });

    describe('mapQRToHousehold', () => {
        test('maps QR to new household (no qrCodeUrl)', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue({
                uid: 'GEN-V001-0001', villageId: 'V001', status: 'notMapped',
            } as never);
            mockStorage.createHousehold.mockResolvedValue({ id: 1, uid: 'V001-0001' } as never);
            mockStorage.createUser.mockResolvedValue({} as never);
            mockStorage.updateQRCodeStatus.mockResolvedValue({} as never);

            const result = await mapQRToHousehold('V001-0001', 'V001', {
                headName: 'Test Head',
                phone: '123',
                houseNumber: '10',
            });

            expect(result.household).toBeDefined();
            expect(result.credentials).toBeDefined();
            expect(mockStorage.updateQRCodeStatus).toHaveBeenCalledWith('GEN-V001-0001', 'mapped', 1);

            // Verify no qrCodeUrl or qrCodePublicId in household creation
            const createCall = mockStorage.createHousehold.mock.calls[0][0];
            expect(createCall).not.toHaveProperty('qrCodeUrl');
            expect(createCall).not.toHaveProperty('qrCodePublicId');
        });

        test('throws when QR already mapped', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue({
                uid: 'GEN-V001-0001', villageId: 'V001', status: 'mapped',
            } as never);

            await expect(
                mapQRToHousehold('V001-0001', 'V001', {
                    headName: 'Test', phone: '123', houseNumber: '10',
                })
            ).rejects.toThrow('QR code is already mapped');
        });

        test('throws when QR village mismatch', async () => {
            mockStorage.getQRCodeByUid.mockResolvedValue({
                uid: 'GEN-V001-0001', villageId: 'V001', status: 'notMapped',
            } as never);

            await expect(
                mapQRToHousehold('V001-0001', 'V002', {
                    headName: 'Test', phone: '123', houseNumber: '10',
                })
            ).rejects.toThrow('Access denied');
        });
    });

    describe('generateBatchPDF', () => {
        test('generates PDF for batch', async () => {
            mockStorage.getQRCodesByBatch.mockResolvedValue([
                { uid: 'GEN-V001-0001', villageId: 'V001' },
            ] as never);

            const result = await generateBatchPDF('BATCH-V001-001');
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('throws when batch not found', async () => {
            mockStorage.getQRCodesByBatch.mockResolvedValue([] as never);
            await expect(generateBatchPDF('BATCH-INVALID'))
                .rejects.toThrow('Batch not found');
        });
    });
});
