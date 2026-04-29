import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getHouseholdByUid: jest.fn(),
    getCollectorByUid: jest.fn(),
    checkExistingCollection: jest.fn(),
    createWasteCollection: jest.fn(),
    getVillageByVillageId: jest.fn(),
    getCollectorsByVillage: jest.fn(),
    getHouseholdsByVillage: jest.fn(),
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

const mockUpdateDailyStats = jest.fn().mockResolvedValue(undefined as never);
jest.unstable_mockModule('../../../server/modules/analytics/daily-stats.storage', () => ({
    updateDailyStatsAfterCollection: mockUpdateDailyStats,
}));

const mockUpdateBehaviourStats = jest.fn().mockResolvedValue(undefined as never);
jest.unstable_mockModule('../../../server/modules/behaviour/behaviour.storage', () => ({
    updateHouseholdBehaviourStats: mockUpdateBehaviourStats,
}));

const mockTriggerProximityAlert = jest.fn().mockResolvedValue(undefined as never);
jest.unstable_mockModule('../../../server/modules/push/push.service', () => ({
    triggerProximityAlert: mockTriggerProximityAlert,
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
        remarks: 'Good',
        photoUrl: '',
        voiceUrl: '',
        status: 'collected',
        missedReason: '',
    };

    describe('submitCollection', () => {
        test('creates collection when no existing collection', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001', ward: 'Ward-1' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001', name: 'Collector1', assignedVehicle: 'KA01' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);
            mockStorage.getVillageByVillageId.mockResolvedValue({ villageId: 'V001', totalHouseholds: 10, vehicles: [{ registrationNumber: 'KA01', name: 'V1' }] } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([{ id: 5, name: 'Collector1', assignedVehicle: 'KA01' }] as never);
            mockStorage.getHouseholdsByVillage.mockResolvedValue([{ id: 1, ward: 'Ward-1' }] as never);

            const result = await submitCollection(validData);

            expect(result.conflict).toBe(false);
            expect(result.collection).toBeDefined();
            expect(mockStorage.createWasteCollection).toHaveBeenCalled();

            // Cache invalidation now runs in fire-and-forget background - wait for it
            await new Promise(r => setTimeout(r, 100));
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
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001', ward: 'Ward-1' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001', name: 'Collector1', assignedVehicle: 'KA01' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({ id: 10 } as never);
            mockStorage.getVillageByVillageId.mockResolvedValue({ villageId: 'V001', totalHouseholds: 10, vehicles: [{ registrationNumber: 'KA01', name: 'V1' }] } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([{ id: 5, name: 'Collector1', assignedVehicle: 'KA01' }] as never);
            mockStorage.getHouseholdsByVillage.mockResolvedValue([{ id: 1, ward: 'Ward-1' }] as never);

            await submitCollection(validData);

            // Cache invalidation now runs in fire-and-forget background - wait for it
            await new Promise(r => setTimeout(r, 100));

            // Village stats cache invalidated
            expect(mockCache.delete).toHaveBeenCalledTimes(1);
            expect(mockCache.delete).toHaveBeenCalledWith('village:V001:stats');
        });

        test('uses client-provided collectionDate', async () => {
            mockStorage.getHouseholdByUid.mockResolvedValue({ id: 1, villageId: 'V001', ward: 'Ward-1' } as never);
            mockStorage.getCollectorByUid.mockResolvedValue({ id: 5, villageId: 'V001', name: 'Collector1', assignedVehicle: 'KA01' } as never);
            mockStorage.checkExistingCollection.mockResolvedValue(null as never);
            mockStorage.createWasteCollection.mockResolvedValue({ id: 10 } as never);
            mockStorage.getVillageByVillageId.mockResolvedValue({ villageId: 'V001', totalHouseholds: 10, vehicles: [] } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([{ id: 5, name: 'Collector1', assignedVehicle: 'KA01' }] as never);
            mockStorage.getHouseholdsByVillage.mockResolvedValue([{ id: 1, ward: 'Ward-1' }] as never);

            await submitCollection({
                ...validData,
                collectionDate: '2025-06-15T10:00:00Z',
            });

            expect(mockStorage.checkExistingCollection).toHaveBeenCalledWith(1, 5, '2025-06-15');
        });
    });
});
