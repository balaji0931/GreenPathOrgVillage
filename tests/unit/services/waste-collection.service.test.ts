import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getHouseholdByUid: jest.fn(),
    getCollectorByUid: jest.fn(),
    checkExistingCollection: jest.fn(),
    createWasteCollection: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

const mockCache = {
    delete: jest.fn().mockResolvedValue(undefined as never),
    clear: jest.fn().mockResolvedValue(undefined as never),
};
jest.unstable_mockModule('../../../server/cache', () => ({
    getCache: () => mockCache,
    cacheKeys: {

        villageStats: (vid: string) => `village:${vid}:stats`,
        dailyReport: (vid: string, date: string) => `report:${vid}:${date}`,
    },
}));

const { submitCollection } =
    await import('../../../server/modules/waste-collection/waste-collection.service');

describe('waste-collection.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const validData = {
        householdUid: 'V001-H0001',
        collectorUserId: 'V001-C1',
        segregationRating: 4,
        plasticRating: 3,
        observations: ['clean'],
        remarks: 'Good',
        photoUrl: '',
        voiceUrl: '',
        status: 'collected',
        missedReason: '',
    };

    describe('submitCollection', () => {
        test('creates collection when no existing collection', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);

            const result = await submitCollection(validData);

            expect(result.conflict).toBe(false);
            expect(result.collection).toBeDefined();
            expect(mockStorage.createWasteCollection).toHaveBeenCalled();
            expect(mockCache.delete).toHaveBeenCalled();
        });

        test('returns conflict when collection already exists today', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue({ id: 99 } as never);

            const result = await submitCollection(validData);

            expect(result.conflict).toBe(true);
            expect(result.message).toContain('already recorded');
            expect(mockStorage.createWasteCollection).not.toHaveBeenCalled();
        });

        test('throws when household not found', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue(null as never);

            await expect(submitCollection(validData)).rejects.toThrow('Household not found');
        });

        test('throws when collector not found', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1 } as never);
            mockStorage.getCollectorByUid.mockResolvedValue(null as never);

            await expect(submitCollection(validData)).rejects.toThrow('Collector not found');
        });

        test('throws VILLAGE_MISMATCH when collector and household are in different villages', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V002' } as never);

            await expect(submitCollection(validData)).rejects.toThrow('VILLAGE_MISMATCH');
        });

        test('invalidates cache on successful collection', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({ id: 10 } as never);

            await submitCollection(validData);

            // Admin stats, village stats, daily report, and report:* pattern
            expect(mockCache.delete).toHaveBeenCalledTimes(2);
            expect(mockCache.clear).toHaveBeenCalledWith('report:*');
        });

        test('uses client-provided collectionDate', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({ id: 10 } as never);

            await submitCollection({
                ...validData,
                collectionDate: '2025-06-15T10:00:00Z',
            });

            expect(mockStorage.checkExistingCollection).toHaveBeenCalledWith(1, 5, '2025-06-15');
        });
    });
});
