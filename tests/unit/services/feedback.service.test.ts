import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockStorage = {
    getCollectionById: jest.fn(),
    getHouseholdByGeneratorUserId: jest.fn(),
    getCollectorsByVillage: jest.fn(),
    getFeedbackByHouseholdAndCollector: jest.fn(),
    createFeedback: jest.fn(),
};
jest.unstable_mockModule('../../../server/storage', () => ({
    storage: mockStorage,
}));

const { submitFeedback } =
    await import('../../../server/modules/feedback/feedback.service');

describe('feedback.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('submitFeedback', () => {
        test('creates feedback for valid data', async () => {
            mockStorage.getCollectionById.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);
            mockStorage.getHouseholdByGeneratorUserId.mockResolvedValue({
                id: 1, villageId: 'V001',
            } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([
                { id: 5, name: 'C1' },
            ] as never);
            mockStorage.getFeedbackByHouseholdAndCollector.mockResolvedValue(null as never);
            mockStorage.createFeedback.mockResolvedValue({
                id: 1, rating: 4, fromHouseholdId: 1, toCollectorId: 5,
            } as never);

            const result = await submitFeedback({
                generatorUserId: 'GEN-V001-H001',
                collectionId: 10,
                rating: 4,
                remarks: 'Good service',
            });

            expect(result.rating).toBe(4);
            expect(mockStorage.createFeedback).toHaveBeenCalledWith(
                expect.objectContaining({
                    fromHouseholdId: 1,
                    toCollectorId: 5,
                    rating: 4,
                })
            );
        });

        test('throws when collection not found', async () => {
            mockStorage.getCollectionById.mockResolvedValue(null as never);

            await expect(
                submitFeedback({
                    generatorUserId: 'GEN-V001-H001',
                    collectionId: 999,
                    rating: 3,
                })
            ).rejects.toThrow('Collection not found');
        });

        test('throws when household not found for generator', async () => {
            mockStorage.getCollectionById.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);
            mockStorage.getHouseholdByGeneratorUserId.mockResolvedValue(null as never);

            await expect(
                submitFeedback({
                    generatorUserId: 'GEN-INVALID',
                    collectionId: 10,
                    rating: 3,
                })
            ).rejects.toThrow('Unauthorized to provide feedback for this collection');
        });

        test('throws when household does not own collection', async () => {
            mockStorage.getCollectionById.mockResolvedValue({
                id: 10, householdId: 99, collectorId: 5,
            } as never);
            mockStorage.getHouseholdByGeneratorUserId.mockResolvedValue({
                id: 1, villageId: 'V001',
            } as never);

            await expect(
                submitFeedback({
                    generatorUserId: 'GEN-V001-H001',
                    collectionId: 10,
                    rating: 3,
                })
            ).rejects.toThrow('Unauthorized');
        });

        test('throws when collector not found in village', async () => {
            mockStorage.getCollectionById.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);
            mockStorage.getHouseholdByGeneratorUserId.mockResolvedValue({
                id: 1, villageId: 'V001',
            } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([] as never);

            await expect(
                submitFeedback({
                    generatorUserId: 'GEN-V001-H001',
                    collectionId: 10,
                    rating: 3,
                })
            ).rejects.toThrow('Collector not found');
        });

        test('throws when feedback already exists', async () => {
            mockStorage.getCollectionById.mockResolvedValue({
                id: 10, householdId: 1, collectorId: 5,
            } as never);
            mockStorage.getHouseholdByGeneratorUserId.mockResolvedValue({
                id: 1, villageId: 'V001',
            } as never);
            mockStorage.getCollectorsByVillage.mockResolvedValue([
                { id: 5, name: 'C1' },
            ] as never);
            mockStorage.getFeedbackByHouseholdAndCollector.mockResolvedValue({
                id: 99,
            } as never);

            await expect(
                submitFeedback({
                    generatorUserId: 'GEN-V001-H001',
                    collectionId: 10,
                    rating: 5,
                })
            ).rejects.toThrow('Feedback already submitted');
        });
    });
});
