import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock storage facade
const mockStorage = {
    getVillages: jest.fn(),
    createVillage: jest.fn(),
    createUser: jest.fn(),
    getVillageStats: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

// Mock bcrypt
jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: jest.fn().mockResolvedValue('hashed-password' as never),
    },
}));

// Import after mocks
const { generateVillageId, createVillageWithManager, getVillagesWithStats } =
    await import('../../../server/modules/village/village.service');

describe('village.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateVillageId', () => {
        test('generates V001 when no villages exist', async () => {
            mockStorage.getVillages.mockResolvedValue([] as never);
            const id = await generateVillageId();
            expect(id).toBe('V001');
        });

        test('generates next sequential ID', async () => {
            mockStorage.getVillages.mockResolvedValue([
                { villageId: 'V001' },
                { villageId: 'V002' },
                { villageId: 'V003' },
            ] as never);
            const id = await generateVillageId();
            expect(id).toBe('V004');
        });

        test('handles gaps in village IDs', async () => {
            mockStorage.getVillages.mockResolvedValue([
                { villageId: 'V001' },
                { villageId: 'V005' },
            ] as never);
            const id = await generateVillageId();
            expect(id).toBe('V006');
        });
    });

    describe('createVillageWithManager', () => {
        test('creates village and manager with correct IDs', async () => {
            mockStorage.getVillages.mockResolvedValue([] as never);
            mockStorage.createVillage.mockResolvedValue({ id: 1, villageId: 'V001', name: 'Test Village' } as never);
            mockStorage.createUser.mockResolvedValue({
                id: 1, userId: 'V001-M1', role: 'manager', name: 'Manager 1',
            } as never);

            const result = await createVillageWithManager({
                villageName: 'Test Village',
                managerName: 'Manager 1',
                managerPhone: '1234567890',
            });

            expect(mockStorage.createVillage).toHaveBeenCalledWith({
                villageId: 'V001',
                name: 'Test Village',
                paymentsEnabled: false,
            });
            expect(mockStorage.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'V001-M1',
                    role: 'manager',
                    name: 'Manager 1',
                    phone: '1234567890',
                    villageId: 'V001',
                })
            );
            expect(result.manager.credentials.userId).toBe('V001-M1');
            expect(result.manager.credentials.password).toBe('V001-M1');
        });
    });

    describe('getVillagesWithStats', () => {
        test('returns villages with stats', async () => {
            mockStorage.getVillages.mockResolvedValue([
                { villageId: 'V001', name: 'Village 1' },
            ] as never);
            mockStorage.getVillageStats.mockResolvedValue({ householdCount: 10 } as never);

            const result = await getVillagesWithStats();
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ villageId: 'V001', householdCount: 10 });
        });

        test('limits to 50 villages', async () => {
            const manyVillages = Array.from({ length: 60 }, (_, i) => ({
                villageId: `V${String(i + 1).padStart(3, '0')}`, name: `Village ${i + 1}`,
            }));
            mockStorage.getVillages.mockResolvedValue(manyVillages as never);
            mockStorage.getVillageStats.mockResolvedValue({ householdCount: 0 } as never);

            const result = await getVillagesWithStats();
            expect(result).toHaveLength(50);
        });
    });
});
