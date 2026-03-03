import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let agent: any;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);
    agent = request.agent(app);
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Auth Integration', () => {
    describe('POST /api/auth/login', () => {
        test('logs in with valid admin credentials', async () => {
            const res = await agent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: process.env.TEST_ADMIN_PASSWORD,
                });

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.role).toBe('admin');
            expect(res.body.csrfToken).toBeDefined();
            expect(res.headers['set-cookie']).toBeDefined();
        });

        test('returns 401 for invalid password', async () => {
            // Fresh agent (no session) so CSRF is not enforced
            const freshAgent = request.agent(app);
            const res = await freshAgent
                .post('/api/auth/login')
                .send({ userId: process.env.TEST_ADMIN_USER, password: 'wrong' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid credentials');
        });

        test('returns 401 for non-existent user', async () => {
            const freshAgent = request.agent(app);
            const res = await freshAgent
                .post('/api/auth/login')
                .send({ userId: 'NONEXISTENT', password: 'test' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/auth/csrf-token', () => {
        test('returns CSRF token', async () => {
            const res = await agent.get('/api/auth/csrf-token');
            expect(res.status).toBe(200);
            expect(res.body.csrfToken).toBeDefined();
            expect(res.body.csrfToken.length).toBe(64);
        });
    });

    describe('GET /api/auth/user', () => {
        test('returns 401 for unauthenticated request', async () => {
            // Fresh agent (no session)
            const freshAgent = request.agent(app);
            const res = await freshAgent.get('/api/auth/user');
            expect(res.status).toBe(401);
        });

        test('returns user info when authenticated', async () => {
            const loginAgent = request.agent(app);
            await loginAgent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: process.env.TEST_ADMIN_PASSWORD,
                });

            const res = await loginAgent.get('/api/auth/user');
            expect(res.status).toBe(200);
            expect(res.body.userId).toBe(process.env.TEST_ADMIN_USER);
            expect(res.body.role).toBe('admin');
        });
    });

    describe('POST /api/auth/change-password', () => {
        test('changes password when authenticated', async () => {
            const loginAgent = request.agent(app);
            const loginRes = await loginAgent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: process.env.TEST_ADMIN_PASSWORD,
                });

            const csrfToken = loginRes.body.csrfToken;

            const res = await loginAgent
                .post('/api/auth/change-password')
                .set('x-csrf-token', csrfToken)
                .send({ newPassword: 'NewPassword123!' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Password changed successfully');

            // Verify can login with new password
            const freshAgent = request.agent(app);
            const newLoginRes = await freshAgent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: 'NewPassword123!',
                });
            expect(newLoginRes.status).toBe(200);

            // Restore original password
            const csrf2 = newLoginRes.body.csrfToken;
            await freshAgent
                .post('/api/auth/change-password')
                .set('x-csrf-token', csrf2)
                .send({ newPassword: process.env.TEST_ADMIN_PASSWORD });
        });
    });

    describe('POST /api/auth/logout', () => {
        test('logs out successfully', async () => {
            const loginAgent = request.agent(app);
            const loginRes = await loginAgent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: process.env.TEST_ADMIN_PASSWORD,
                });
            const logoutCsrf = loginRes.body.csrfToken;

            const res = await loginAgent
                .post('/api/auth/logout')
                .set('x-csrf-token', logoutCsrf);
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Logged out successfully');

            // Session should be destroyed
            const userRes = await loginAgent.get('/api/auth/user');
            expect(userRes.status).toBe(401);
        });
    });
});
