import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let adminCsrf: string;
let villageId: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    // Create a village first
    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Admin OPs Village', managerName: 'Admin Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Admin Users Integration', () => {
    let moderatorId: string;

    describe('POST /api/moderators', () => {
        test('creates moderator with village assignment', async () => {
            const res = await adminAgent
                .post('/api/moderators')
                .set('x-csrf-token', adminCsrf)
                .send({
                    name: 'Test Moderator',
                    phone: '9876543210',
                    email: 'mod@test.com',
                    villageIds: [villageId],
                });

            expect(res.status).toBe(200);
            expect(res.body.moderator).toBeDefined();
            expect(res.body.credentials).toBeDefined();
            expect(res.body.credentials.userId).toContain('MOD-');
            moderatorId = res.body.credentials.userId;
        });
    });

    describe('GET /api/moderators', () => {
        test('returns moderators with villages', async () => {
            const res = await adminAgent.get('/api/moderators');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('POST /api/moderators/:moderatorId/villages', () => {
        test('assigns village to moderator', async () => {
            // Create second village
            const v2Res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: 'Second Admin V', managerName: 'Mgr 2', paymentsEnabled: true, managerPhone: '2222222222' });
            const v2Id = v2Res.body.village.villageId;

            const res = await adminAgent
                .post(`/api/moderators/${moderatorId}/villages`)
                .set('x-csrf-token', adminCsrf)
                .send({ villageId: v2Id });

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/moderators/:moderatorId/villages', () => {
        test('returns villages assigned to moderator', async () => {
            const res = await adminAgent.get(`/api/moderators/${moderatorId}/villages`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('PUT /api/managers/:managerId/reset-password', () => {
        test('resets manager password', async () => {
            const managerId = `${villageId}-M1`;
            const res = await adminAgent
                .put(`/api/managers/${managerId}/reset-password`)
                .set('x-csrf-token', adminCsrf);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('reset');
        });
    });

    describe('POST /api/villages/:villageId/managers', () => {
        test('adds another manager to village', async () => {
            const res = await adminAgent
                .post(`/api/villages/${villageId}/managers`)
                .set('x-csrf-token', adminCsrf)
                .send({ managerName: 'Second Manager', paymentsEnabled: true, managerPhone: '3333333333' });

            expect(res.status).toBe(200);
            expect(res.body.manager.credentials).toBeDefined();
        });
    });

    describe('GET /api/managers', () => {
        test('returns all managers', async () => {
            const res = await adminAgent.get('/api/managers');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('PUT /api/moderators/:moderatorId/reset-password', () => {
        test('resets moderator password', async () => {
            const res = await adminAgent
                .put(`/api/moderators/${moderatorId}/reset-password`)
                .set('x-csrf-token', adminCsrf);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('reset');
        });
    });
});
