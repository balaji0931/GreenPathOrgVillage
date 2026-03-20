import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock the moderator storage before importing the middleware
const mockIsModeratorAssigned = jest.fn();
jest.unstable_mockModule('../../../server/modules/moderation/moderator.storage', () => ({
    isModeratorAssignedToVillage: mockIsModeratorAssigned,
}));

const { requireVillageAccess } = await import('../../../server/common/middleware/village-access');

function createMockReqResNext(overrides: any = {}) {
    const req: any = {
        params: {},
        body: {},
        query: {},
        session: { role: 'manager', villageId: 'V001' },
        ...overrides,
    };
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('requireVillageAccess middleware', () => {
    test('admin can access any village', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'admin', villageId: 'V001' },
            params: { villageId: 'V999' },
        });
        requireVillageAccess(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('moderator can access (check deferred to storage)', async () => {
        mockIsModeratorAssigned.mockResolvedValue(true as never);
        const { req, res, next } = createMockReqResNext({
            session: { role: 'moderator', villageId: 'V001', userId: 'MOD-001' },
            params: { villageId: 'V002' },
        });
        await requireVillageAccess(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('manager can access own village', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'manager', villageId: 'V001' },
            params: { villageId: 'V001' },
        });
        requireVillageAccess(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('manager denied access to other village', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'manager', villageId: 'V001' },
            params: { villageId: 'V002' },
        });
        requireVillageAccess(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Access denied: Village mismatch' });
        expect(next).not.toHaveBeenCalled();
    });

    test('collector denied access to other village', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'collector', villageId: 'V001' },
            body: { villageId: 'V002' },
        });
        requireVillageAccess(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('generator denied access to other village via query', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'generator', villageId: 'V001' },
            query: { villageId: 'V002' },
        });
        requireVillageAccess(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('passes when no villageId in request', () => {
        const { req, res, next } = createMockReqResNext({
            session: { role: 'manager', villageId: 'V001' },
        });
        requireVillageAccess(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
