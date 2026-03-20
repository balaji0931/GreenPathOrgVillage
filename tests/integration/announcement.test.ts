import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let adminCsrf: string;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin login + create village
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Announce Village', managerName: 'Ann Manager', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    // Manager login
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Announcement Integration', () => {
    let announcementId: number;

    describe('POST /api/announcements', () => {
        test('admin creates global announcement', async () => {
            const res = await adminAgent
                .post('/api/announcements')
                .set('x-csrf-token', adminCsrf)
                .send({ message: 'Global test announcement', targetAudience: 'all' });

            expect(res.status).toBe(200);
            expect(res.body.id).toBeDefined();
            announcementId = res.body.id;
        });

        test('manager creates village announcement', async () => {
            const res = await managerAgent
                .post('/api/announcements')
                .set('x-csrf-token', managerCsrf)
                .send({ message: 'Village announcement', targetAudience: 'all' });

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/announcements', () => {
        test('returns announcements for authenticated user', async () => {
            const res = await managerAgent.get('/api/announcements');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/admin/announcements', () => {
        test('admin gets all announcements', async () => {
            const res = await adminAgent.get('/api/admin/announcements');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('DELETE /api/announcements/:id', () => {
        test('deletes announcement', async () => {
            const res = await adminAgent
                .delete(`/api/announcements/${announcementId}`)
                .set('x-csrf-token', adminCsrf);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted');
        });
    });
});
