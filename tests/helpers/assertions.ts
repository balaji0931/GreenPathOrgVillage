import type { Response } from 'supertest';

/**
 * Assert response is 401 Unauthorized.
 */
export function expectUnauthorized(res: Response) {
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
}

/**
 * Assert response is 403 Forbidden (role or CSRF).
 */
export function expectForbidden(res: Response) {
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message');
}

/**
 * Assert response is 400 Bad Request (validation error).
 */
export function expectValidationError(res: Response) {
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
}

/**
 * Assert response is 404 Not Found.
 */
export function expectNotFound(res: Response) {
    expect(res.status).toBe(404);
}

/**
 * Assert response is 409 Conflict (duplicate).
 */
export function expectConflict(res: Response) {
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('message');
}

/**
 * Assert successful response (2xx).
 */
export function expectSuccess(res: Response) {
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
}
