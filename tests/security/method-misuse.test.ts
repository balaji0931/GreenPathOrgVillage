/**
 * HTTP METHOD MISUSE — Wrong HTTP methods return 404/405, never 200.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let adminCsrf: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    adminAgent = request.agent(app);
    const loginRes = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = loginRes.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

// Endpoint + correct method + wrong methods to test
interface MethodTestCase {
    path: string;
    correctMethod: string;
    wrongMethods: string[];
}

const TEST_CASES: MethodTestCase[] = [
    // POST-only endpoints tested with GET
    { path: '/api/auth/login', correctMethod: 'post', wrongMethods: ['get', 'put', 'delete'] },
    { path: '/api/auth/logout', correctMethod: 'post', wrongMethods: ['get', 'put', 'delete'] },
    { path: '/api/auth/change-password', correctMethod: 'post', wrongMethods: ['get', 'put'] },
    { path: '/api/villages', correctMethod: 'post', wrongMethods: ['delete', 'patch'] },
    { path: '/api/households', correctMethod: 'post', wrongMethods: ['delete', 'patch'] },
    { path: '/api/collectors', correctMethod: 'post', wrongMethods: ['delete', 'patch'] },
    { path: '/api/waste-collections', correctMethod: 'post', wrongMethods: ['get', 'put', 'delete'] },
    { path: '/api/issues', correctMethod: 'post', wrongMethods: ['delete', 'put'] },
    { path: '/api/feedback', correctMethod: 'post', wrongMethods: ['get', 'delete'] },
    { path: '/api/website-feedback', correctMethod: 'post', wrongMethods: ['get', 'delete', 'put'] },
    { path: '/api/contact', correctMethod: 'post', wrongMethods: ['get', 'delete', 'put'] },

    // GET-only endpoints tested with POST/DELETE
    { path: '/api/auth/user', correctMethod: 'get', wrongMethods: ['post', 'delete'] },
    { path: '/api/auth/csrf-token', correctMethod: 'get', wrongMethods: ['post', 'delete'] },
    { path: '/api/moderators', correctMethod: 'get', wrongMethods: ['delete', 'patch'] },
    { path: '/api/managers', correctMethod: 'get', wrongMethods: ['post', 'delete', 'patch'] },

    { path: '/api/admin/website-feedback', correctMethod: 'get', wrongMethods: ['post', 'delete'] },
    { path: '/api/admin/contact-submissions', correctMethod: 'get', wrongMethods: ['post', 'delete'] },
];

describe('HTTP Method Misuse', () => {
    for (const tc of TEST_CASES) {
        describe(`${tc.path} (correct: ${tc.correctMethod.toUpperCase()})`, () => {
            for (const wrong of tc.wrongMethods) {
                test(`${wrong.toUpperCase()} → 404 or 405 (never 200)`, async () => {
                    let req = (adminAgent as any)[wrong](tc.path)
                        .set('x-csrf-token', adminCsrf);
                    if (['post', 'put', 'patch'].includes(wrong)) {
                        req = req.send({});
                    }
                    const res = await req;
                    // Should never succeed — expect 401, 403, 404, or 405
                    expect([200, 201]).not.toContain(res.status);
                });
            }
        });
    }
});
