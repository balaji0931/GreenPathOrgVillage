import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin creates village
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    const adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Collector Village', managerName: 'Col Manager', managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    // Login as manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Collector Integration', () => {
    let collectorUid: string;

    describe('POST /api/collectors', () => {
        test('creates collector with user account', async () => {
            const res = await managerAgent
                .post('/api/collectors')
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'Collector One', phone: '9876543210' });

            expect(res.status).toBe(200);
            expect(res.body.uid).toContain(villageId);
            expect(res.body.name).toBe('Collector One');
            collectorUid = res.body.uid;
        });

        test('creates second collector with incremented UID', async () => {
            const res = await managerAgent
                .post('/api/collectors')
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'Collector Two', phone: '1234567890' });

            expect(res.status).toBe(200);
            expect(res.body.uid).not.toBe(collectorUid);
        });
    });

    describe('GET /api/collectors', () => {
        test('returns collectors for village', async () => {
            const res = await managerAgent.get('/api/collectors');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });
    });

    describe('GET /api/collectors/stats/:villageId', () => {
        test('returns collector stats', async () => {
            const res = await managerAgent.get(`/api/collectors/stats/${villageId}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('Collector login', () => {
        test('collector can login with auto-created credentials', async () => {
            const collectorAgent = request.agent(app);
            const res = await collectorAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });

            expect(res.status).toBe(200);
            expect(res.body.user.role).toBe('collector');
        });
    });
});
