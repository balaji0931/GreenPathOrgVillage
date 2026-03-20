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
let collectorUid: string;

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
        .send({ villageName: 'Issue Village', managerName: 'Issue Manager', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    // Login as manager, create collector for issue reporting
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'Issue Reporter', phone: '7777777777' });
    collectorUid = colRes.body.uid;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Issue Integration', () => {
    let issueId: number;

    describe('POST /api/issues', () => {
        test('creates issue as collector', async () => {
            const collectorAgent = request.agent(app);
            const cLogin = await collectorAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });
            const cCsrf = cLogin.body.csrfToken;

            const res = await collectorAgent
                .post('/api/issues')
                .set('x-csrf-token', cCsrf)
                .send({
                    title: 'Bins overflowing',
                    description: 'The bins near block A are overflowing with waste',
                    category: 'waste',
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('reported successfully');
            issueId = res.body.id;
        });

        test('rejects issue with short title', async () => {
            const collectorAgent = request.agent(app);
            const cLogin = await collectorAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });
            const cCsrf = cLogin.body.csrfToken;

            const res = await collectorAgent
                .post('/api/issues')
                .set('x-csrf-token', cCsrf)
                .send({ title: 'AB', description: 'Description long enough here', category: 'waste' });

            expect(res.status).toBe(400);
        });

        test('rejects issue with short description', async () => {
            const collectorAgent = request.agent(app);
            const cLogin = await collectorAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });
            const cCsrf = cLogin.body.csrfToken;

            const res = await collectorAgent
                .post('/api/issues')
                .set('x-csrf-token', cCsrf)
                .send({ title: 'Valid Title', description: 'Short', category: 'waste' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/issues', () => {
        test('returns issues for village (manager)', async () => {
            const res = await managerAgent.get('/api/issues');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/issues/paginated', () => {
        test('returns paginated issues', async () => {
            const res = await managerAgent.get('/api/issues/paginated?page=1&limit=10');
            expect(res.status).toBe(200);
        });
    });

    describe('PATCH /api/issues/:id', () => {
        test('rejects status change without proof photo', async () => {
            const res = await managerAgent
                .patch(`/api/issues/${issueId}`)
                .set('x-csrf-token', managerCsrf)
                .send({ status: 'resolved' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Proof photo');
        });

        test('updates issue with proof photo', async () => {
            const res = await managerAgent
                .patch(`/api/issues/${issueId}`)
                .set('x-csrf-token', managerCsrf)
                .send({
                    status: 'resolved',
                    managerReply: 'Fixed the bins',
                    managerProofPhotoUrl: 'https://test.cloudinary.com/proof.jpg',
                });

            expect(res.status).toBe(200);
        });
    });
});
