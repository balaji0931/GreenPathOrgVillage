import { describe, test, expect, jest } from '@jest/globals';
import { requireAuth, requireRole } from '../../../server/common/middleware/auth';

function createMockReqResNext() {
    const req: any = { session: {} };
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('requireAuth middleware', () => {
    test('calls next() when session has userId', () => {
        const { req, res, next } = createMockReqResNext();
        req.session.userId = 'ADMIN';
        requireAuth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('returns 401 when session has no userId', () => {
        const { req, res, next } = createMockReqResNext();
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when session is undefined', () => {
        const { req, res, next } = createMockReqResNext();
        req.session = undefined;
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('requireRole middleware', () => {
    test('calls next() when role matches', () => {
        const { req, res, next } = createMockReqResNext();
        req.session.role = 'admin';
        requireRole(['admin'])(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('calls next() when role is in allowed list', () => {
        const { req, res, next } = createMockReqResNext();
        req.session.role = 'manager';
        requireRole(['admin', 'manager'])(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('returns 403 when role is not in allowed list', () => {
        const { req, res, next } = createMockReqResNext();
        req.session.role = 'collector';
        requireRole(['admin'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when session has no role', () => {
        const { req, res, next } = createMockReqResNext();
        requireRole(['admin'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 403 when session is undefined', () => {
        const { req, res, next } = createMockReqResNext();
        req.session = undefined;
        requireRole(['admin'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
