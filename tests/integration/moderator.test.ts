import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let moderatorAgent: any;
let moderatorCsrf: string;
let moderatorId: string;
let villageId: string;
let managerId: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin creates village + moderator
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    const adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Mod Village', managerName: 'Mod Manager', managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    managerId = villageRes.body.manager.credentials.userId;

    const modRes = await adminAgent
        .post('/api/moderators')
        .set('x-csrf-token', adminCsrf)
        .send({ name: 'Test Mod', phone: '9999999999', email: 'mod@t.com', villageIds: [villageId] });
    moderatorId = modRes.body.credentials.userId;

    // Login as moderator
    moderatorAgent = request.agent(app);
    const modLogin = await moderatorAgent
        .post('/api/auth/login')
        .send({ userId: moderatorId, password: moderatorId });
    moderatorCsrf = modLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Moderator Integration', () => {
    describe('GET /api/moderator/villages', () => {
        test('returns assigned villages', async () => {
            const res = await moderatorAgent.get('/api/moderator/villages');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body.some((v: any) => v.villageId === villageId)).toBe(true);
        });
    });

    describe('GET /api/moderator/village/:villageId/details', () => {
        test('returns details for assigned village', async () => {
            const res = await moderatorAgent.get(`/api/moderator/village/${villageId}/details`);
            expect(res.status).toBe(200);
        });

        test('returns 403 for non-assigned village', async () => {
            const res = await moderatorAgent.get('/api/moderator/village/V999/details');
            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/moderator/village/:villageId/managers', () => {
        test('returns managers for assigned village', async () => {
            const res = await moderatorAgent.get(`/api/moderator/village/${villageId}/managers`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /api/moderator/managers', () => {
        test('returns all managers across assigned villages', async () => {
            const res = await moderatorAgent.get('/api/moderator/managers');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('POST /api/moderator/announcements', () => {
        test('creates announcement for assigned villages', async () => {
            const res = await moderatorAgent
                .post('/api/moderator/announcements')
                .set('x-csrf-token', moderatorCsrf)
                .send({ message: 'Moderator announcement', targetAudience: 'all' });

            expect(res.status).toBe(200);
            expect(res.body.villageCount).toBeGreaterThanOrEqual(1);
        });
    });


    describe('PUT /api/moderator/managers/:managerId/reset-password', () => {
        test('resets password for manager in assigned village', async () => {
            const res = await moderatorAgent
                .put(`/api/moderator/managers/${managerId}/reset-password`)
                .set('x-csrf-token', moderatorCsrf);

            expect(res.status).toBe(200);
            expect(res.body.newPassword).toBe(managerId);
        });
    });

    describe('GET /api/moderator/issues', () => {
        test('returns issues across assigned villages', async () => {
            const res = await moderatorAgent.get('/api/moderator/issues');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /api/moderator/households', () => {
        test('returns households across assigned villages', async () => {
            const res = await moderatorAgent.get('/api/moderator/households');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /api/moderator/collectors', () => {
        test('returns collectors across assigned villages', async () => {
            const res = await moderatorAgent.get('/api/moderator/collectors');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
