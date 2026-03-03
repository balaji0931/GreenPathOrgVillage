import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    createIssue: jest.fn(),
    updateIssue: jest.fn(),
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
        issues: (vid: string) => `issues:${vid}`,
        villageDetails: (vid: string) => `village:${vid}:details`,
    },
}));

const { createIssue, updateIssueStatus } =
    await import('../../../server/modules/issue/issue.service');

describe('issue.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createIssue', () => {
        test('creates issue with valid data', async () => {
            const fakeIssue = { id: 1, title: 'Garbage overflow', status: 'open' };
            mockStorage.createIssue.mockResolvedValue(fakeIssue as never);

            const result = await createIssue({
                title: 'Garbage overflow',
                description: 'Bins are overflowing near block A',
                category: 'waste',
                reportedBy: 'V001-M1',
                villageId: 'V001',
            });

            expect(result).toEqual(fakeIssue);
            expect(mockStorage.createIssue).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Garbage overflow',
                    status: 'open',
                })
            );
        });

        test('throws validation error when title missing', async () => {
            await expect(
                createIssue({
                    title: '',
                    description: 'Some description here',
                    category: 'waste',
                    reportedBy: 'V001-M1',
                    villageId: 'V001',
                })
            ).rejects.toThrow();
        });

        test('throws when title too short', async () => {
            await expect(
                createIssue({
                    title: 'AB',
                    description: 'Some description that is long enough',
                    category: 'waste',
                    reportedBy: 'V001-M1',
                    villageId: 'V001',
                })
            ).rejects.toThrow('Title must be at least 3 characters long');
        });

        test('throws when description too short', async () => {
            await expect(
                createIssue({
                    title: 'Valid title',
                    description: 'Short',
                    category: 'waste',
                    reportedBy: 'V001-M1',
                    villageId: 'V001',
                })
            ).rejects.toThrow('Description must be at least 10 characters long');
        });

        test('trims whitespace from title and description', async () => {
            mockStorage.createIssue.mockResolvedValue({ id: 1 } as never);

            await createIssue({
                title: '  Garbage overflow  ',
                description: '  Bins are overflowing near block A  ',
                category: 'waste',
                reportedBy: 'V001-M1',
                villageId: 'V001',
            });

            expect(mockStorage.createIssue).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Garbage overflow',
                    description: 'Bins are overflowing near block A',
                })
            );
        });
    });

    describe('updateIssueStatus', () => {
        test('updates issue and invalidates cache', async () => {
            mockStorage.updateIssue.mockResolvedValue({ id: 1, status: 'resolved' } as never);

            const result = await updateIssueStatus(
                1,
                { status: 'resolved', managerProofPhotoUrl: 'https://photo.jpg' },
                'V001'
            );

            expect(mockStorage.updateIssue).toHaveBeenCalled();
            expect(mockCache.delete).toHaveBeenCalled();
            expect(result.status).toBe('resolved');
        });

        test('throws when proof photo missing for resolved status', async () => {
            await expect(
                updateIssueStatus(1, { status: 'resolved' }, 'V001')
            ).rejects.toThrow("Proof photo is required");
        });

        test('throws when proof photo missing for in_progress status', async () => {
            await expect(
                updateIssueStatus(1, { status: 'in_progress' }, 'V001')
            ).rejects.toThrow("Proof photo is required");
        });
    });
});
