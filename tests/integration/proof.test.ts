/**
 * Minimal proof test — validates that test infrastructure works.
 * This test verifies:
 * 1. Jest boots in ESM mode
 * 2. .env.test loads correctly
 * 3. Test DB is reachable
 * 4. TRUNCATE + admin seeding works
 * 5. Test app starts without errors
 * 6. API responds to requests
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { getTestApp, closeTestApp } from '../helpers/app';
import { resetTestDB, closeCleanupPool } from '../helpers/cleanup';
import { loginAsAdmin } from '../helpers/auth';
import type { Express } from 'express';

let app: Express;

describe('Infrastructure Proof Test', () => {
    beforeAll(async () => {
        await resetTestDB();
        app = await getTestApp();
    }, 30000);

    afterAll(async () => {
        await closeTestApp();
        await closeCleanupPool();
    });

    test('environment is set to test', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });

    test('BCRYPT_ROUNDS is 1', () => {
        expect(process.env.BCRYPT_ROUNDS).toBe('1');
    });

    test('test database is accessible', async () => {
        // If resetTestDB() succeeded, DB is accessible
        expect(true).toBe(true);
    });

    test('app responds to CSRF token request', async () => {
        const res = await request(app).get('/api/auth/csrf-token');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('csrfToken');
    });

    test('admin can login', async () => {
        const agent = request.agent(app);
        const { cookie, csrfToken } = await loginAsAdmin(agent);
        expect(cookie).toBeDefined();
        expect(cookie.length).toBeGreaterThan(0);
        expect(csrfToken).toBeDefined();
    });

    test('unauthenticated request returns 401', async () => {
        const res = await request(app).get('/api/auth/user');
        expect(res.status).toBe(401);
    });
});
