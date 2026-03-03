import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getCollectorsByVillage: jest.fn(),
    createCollector: jest.fn(),
    createUser: jest.fn(),
    getCollectorStats: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: jest.fn().mockResolvedValue('hashed-password' as never),
    },
}));

const { generateCollectorUid, createCollectorWithAccount, getCollectorStatsForVillage } =
    await import('../../../server/modules/collector/collector.service');

describe('collector.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateCollectorUid', () => {
        test('generates first collector UID', async () => {
            mockStorage.getCollectorsByVillage.mockResolvedValue([] as never);
            const uid = await generateCollectorUid('V001');
            expect(uid).toBe('V001-C1');
        });

        test('generates sequential UIDs', async () => {
            mockStorage.getCollectorsByVillage.mockResolvedValue([
                { uid: 'V001-C1' }, { uid: 'V001-C2' },
            ] as never);
            const uid = await generateCollectorUid('V001');
            expect(uid).toBe('V001-C3');
        });
    });

    describe('createCollectorWithAccount', () => {
        test('creates collector and user account', async () => {
            mockStorage.getCollectorsByVillage.mockResolvedValue([] as never);
            mockStorage.createCollector.mockResolvedValue({
                id: 1, uid: 'V001-C1', name: 'Collector 1',
            } as never);
            mockStorage.createUser.mockResolvedValue({} as never);

            const result = await createCollectorWithAccount({
                name: 'Collector 1',
                phone: '1234567890',
                villageId: 'V001',
            });

            expect(mockStorage.createCollector).toHaveBeenCalledWith({
                uid: 'V001-C1',
                villageId: 'V001',
                name: 'Collector 1',
                phone: '1234567890',
            });
            expect(mockStorage.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'V001-C1',
                    role: 'collector',
                    name: 'Collector 1',
                })
            );
            expect(result.uid).toBe('V001-C1');
        });
    });

    describe('getCollectorStatsForVillage', () => {
        test('returns stats for all collectors', async () => {
            mockStorage.getCollectorsByVillage.mockResolvedValue([
                { id: 1, name: 'C1' }, { id: 2, name: 'C2' },
            ] as never);
            mockStorage.getCollectorStats.mockResolvedValue({ totalCollections: 10 } as never);

            const result = await getCollectorStatsForVillage('V001');
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ id: 1, name: 'C1', totalCollections: 10 });
        });

        test('returns empty array when no collectors', async () => {
            mockStorage.getCollectorsByVillage.mockResolvedValue([] as never);
            const result = await getCollectorStatsForVillage('V001');
            expect(result).toHaveLength(0);
        });
    });
});
