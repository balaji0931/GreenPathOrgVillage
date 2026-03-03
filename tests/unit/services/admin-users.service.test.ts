import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getModeratorsList: jest.fn(),
    createModerator: jest.fn(),
    assignVillageToModerator: jest.fn(),
    getModeratorVillages: jest.fn(),
    updateUserPassword: jest.fn(),
    addManagerToVillage: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

jest.unstable_mockModule('bcrypt', () => ({
    default: {
        hash: jest.fn().mockResolvedValue('hashed-password' as never),
    },
}));

const {
    generateModeratorId,
    createModerator,
    getModeratorsWithVillages,
    resetPasswordToUserId,
    addManagerToVillage,
} = await import('../../../server/modules/admin/admin-users.service');

describe('admin-users.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateModeratorId', () => {
        test('generates MOD-001 when no moderators exist', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([] as never);
            const id = await generateModeratorId();
            expect(id).toBe('MOD-001');
        });

        test('generates next sequential ID', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([
                { moderatorId: 'MOD-001' },
                { moderatorId: 'MOD-002' },
            ] as never);
            const id = await generateModeratorId();
            expect(id).toBe('MOD-003');
        });

        test('fills gaps in IDs', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([
                { moderatorId: 'MOD-002' },
                { moderatorId: 'MOD-003' },
            ] as never);
            const id = await generateModeratorId();
            expect(id).toBe('MOD-001');
        });
    });

    describe('createModerator', () => {
        test('creates moderator and assigns villages', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([] as never);
            mockStorage.createModerator.mockResolvedValue({
                id: 1, moderatorId: 'MOD-001', name: 'Mod 1',
            } as never);
            mockStorage.assignVillageToModerator.mockResolvedValue({} as never);

            const result = await createModerator({
                name: 'Mod 1',
                phone: '1234567890',
                email: 'mod@test.com',
                villageIds: ['V001', 'V002'],
                createdBy: 'ADMIN',
            });

            expect(mockStorage.createModerator).toHaveBeenCalledWith(
                expect.objectContaining({ moderatorId: 'MOD-001', name: 'Mod 1' })
            );
            expect(mockStorage.assignVillageToModerator).toHaveBeenCalledTimes(2);
            expect(result.credentials.userId).toBe('MOD-001');
            expect(result.credentials.password).toBe('MOD-001');
        });

        test('creates moderator without villages', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([] as never);
            mockStorage.createModerator.mockResolvedValue({
                id: 1, moderatorId: 'MOD-001', name: 'Mod 1',
            } as never);

            await createModerator({
                name: 'Mod 1',
                phone: '123',
                email: 'mod@test.com',
                villageIds: [],
                createdBy: 'ADMIN',
            });

            expect(mockStorage.assignVillageToModerator).not.toHaveBeenCalled();
        });
    });

    describe('getModeratorsWithVillages', () => {
        test('enriches moderators with village assignments', async () => {
            mockStorage.getModeratorsList.mockResolvedValue([
                { moderatorId: 'MOD-001', name: 'Mod 1' },
            ] as never);
            mockStorage.getModeratorVillages.mockResolvedValue([
                { villageId: 'V001', name: 'Village 1' },
            ] as never);

            const result = await getModeratorsWithVillages();
            expect(result).toHaveLength(1);
            expect(result[0].villages).toHaveLength(1);
        });
    });

    describe('resetPasswordToUserId', () => {
        test('resets password to the user ID', async () => {
            mockStorage.updateUserPassword.mockResolvedValue(undefined as never);

            const newPassword = await resetPasswordToUserId('V001-M1');
            expect(newPassword).toBe('V001-M1');
            expect(mockStorage.updateUserPassword).toHaveBeenCalledWith('V001-M1', 'hashed-password');
        });
    });

    describe('addManagerToVillage', () => {
        test('returns manager with credentials', async () => {
            mockStorage.addManagerToVillage.mockResolvedValue({
                id: 5, userId: 'V001-M2', name: 'Manager 2',
            } as never);

            const result = await addManagerToVillage('V001', {
                managerName: 'Manager 2',
                managerPhone: '123',
            });

            expect(result.manager.credentials.userId).toBe('V001-M2');
            expect(result.manager.credentials.password).toBe('V001-M2');
        });
    });
});
