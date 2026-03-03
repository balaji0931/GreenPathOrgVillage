import { describe, test, expect, jest } from '@jest/globals';
import { csrfProtection, generateCsrfToken } from '../../../server/common/middleware/csrf';

function createMockReqResNext(overrides: any = {}) {
    const req: any = {
        method: 'POST',
        path: '/api/some-endpoint',
        session: { userId: 'USER1', csrfToken: 'valid-token' },
        headers: { 'x-csrf-token': 'valid-token' },
        ...overrides,
    };
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('generateCsrfToken', () => {
    test('returns a 64-character hex string', () => {
        const token = generateCsrfToken();
        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[a-f0-9]+$/);
    });

    test('generates unique tokens', () => {
        const t1 = generateCsrfToken();
        const t2 = generateCsrfToken();
        expect(t1).not.toBe(t2);
    });
});

describe('csrfProtection middleware', () => {
    test('skips check for GET requests', () => {
        const { req, res, next } = createMockReqResNext({ method: 'GET' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for HEAD requests', () => {
        const { req, res, next } = createMockReqResNext({ method: 'HEAD' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for OPTIONS requests', () => {
        const { req, res, next } = createMockReqResNext({ method: 'OPTIONS' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for public /api/auth/login', () => {
        const { req, res, next } = createMockReqResNext({ path: '/api/auth/login' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for public /api/auth/logout', () => {
        const { req, res, next } = createMockReqResNext({ path: '/api/auth/logout' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for public /api/website-feedback', () => {
        const { req, res, next } = createMockReqResNext({ path: '/api/website-feedback' });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('skips check for unauthenticated requests', () => {
        const { req, res, next } = createMockReqResNext({
            session: {},
        });
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('passes when CSRF tokens match', () => {
        const { req, res, next } = createMockReqResNext();
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('returns 403 when CSRF header missing', () => {
        const { req, res, next } = createMockReqResNext({
            headers: {},
        });
        csrfProtection(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid CSRF token' });
    });

    test('returns 403 when CSRF tokens mismatch', () => {
        const { req, res, next } = createMockReqResNext({
            headers: { 'x-csrf-token': 'wrong-token' },
        });
        csrfProtection(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 403 when session has no CSRF token', () => {
        const { req, res, next } = createMockReqResNext({
            session: { userId: 'USER1' },
            headers: { 'x-csrf-token': 'some-token' },
        });
        csrfProtection(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
