/**
 * ISSUE LIFECYCLE — Issue state machine + cache consistency.
 *
 * open → in_progress (proof required) → resolved (proof required).
 * Cache invalidation verified via double-fetch.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any, managerCsrf: string;
let collectorAgent: any, collectorCsrf: string;
let villageId: string;
let issueId: number;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin → Village
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    const adminCsrf = adminLogin.body.csrfToken;

    const vRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Issue Village', managerName: 'Issue Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = vRes.body.village.villageId;
    const mgrId = vRes.body.manager.credentials.userId;

    // Manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: mgrId, password: mgrId });
    managerCsrf = mLogin.body.csrfToken;

    // Collector
    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'Issue Collector', phone: '2222222222' });
    const colUid = colRes.body.uid;

    collectorAgent = request.agent(app);
    const cLogin = await collectorAgent
        .post('/api/auth/login')
        .send({ userId: colUid, password: colUid });
    collectorCsrf = cLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Issue Lifecycle', () => {
    test('1. Collector creates issue → status open', async () => {
        const res = await collectorAgent
            .post('/api/issues')
            .set('x-csrf-token', collectorCsrf)
            .send({
                title: 'Broken bin near school',
                description: 'The waste bin near the primary school is broken and overflowing',
                category: 'waste',
            });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('open');
        expect(res.body.id).toBeDefined();
        issueId = res.body.id;
    });

    test('2. Manager updates to in_progress WITHOUT proof → 400', async () => {
        const res = await managerAgent
            .patch(`/api/issues/${issueId}`)
            .set('x-csrf-token', managerCsrf)
            .send({ status: 'in_progress' });

        expect(res.status).toBe(400);
    });

    test('3. Manager updates to in_progress WITH proof → 200', async () => {
        const res = await managerAgent
            .patch(`/api/issues/${issueId}`)
            .set('x-csrf-token', managerCsrf)
            .send({
                status: 'in_progress',
                managerReply: 'Working on it',
                managerProofPhotoUrl: 'https://example.com/proof1.jpg',
            });

        expect(res.status).toBe(200);
    });

    test('4. Issue status persisted as in_progress', async () => {
        const res = await managerAgent.get('/api/issues');
        expect(res.status).toBe(200);
        const issue = res.body.find((i: any) => i.id === issueId);
        expect(issue).toBeDefined();
        expect(issue.status).toBe('in_progress');
    });

    test('5. Manager updates to resolved WITH proof → 200', async () => {
        const res = await managerAgent
            .patch(`/api/issues/${issueId}`)
            .set('x-csrf-token', managerCsrf)
            .send({
                status: 'resolved',
                managerReply: 'Fixed',
                managerProofPhotoUrl: 'https://example.com/proof2.jpg',
            });

        expect(res.status).toBe(200);
    });

    test('6. Issue status persisted as resolved', async () => {
        const res = await managerAgent.get('/api/issues');
        expect(res.status).toBe(200);
        const issue = res.body.find((i: any) => i.id === issueId);
        expect(issue.status).toBe('resolved');
    });

    test('7. Cache invalidated: re-fetch shows updated status (no stale data)', async () => {
        // Fetch 1
        const fetch1 = await managerAgent.get('/api/issues');
        const issue1 = fetch1.body.find((i: any) => i.id === issueId);
        expect(issue1.status).toBe('resolved');

        // Fetch 2 — should return same data (no double-update)
        const fetch2 = await managerAgent.get('/api/issues');
        const issue2 = fetch2.body.find((i: any) => i.id === issueId);
        expect(issue2.status).toBe('resolved');
    });

    test('8. Issue created by collector visible to same-village manager only', async () => {
        const adminAgent = request.agent(app);
        const adminLogin = await adminAgent
            .post('/api/auth/login')
            .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
        const adminCsrf = adminLogin.body.csrfToken;

        // Create second village + manager
        const v2 = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Other Issue Village', managerName: 'Other Mgr', paymentsEnabled: true, managerPhone: '5555555555' });
        const mgr2Id = v2.body.manager.credentials.userId;

        const mgr2Agent = request.agent(app);
        const m2Login = await mgr2Agent
            .post('/api/auth/login')
            .send({ userId: mgr2Id, password: mgr2Id });

        // Manager 2 should not see village 1's issues
        const res = await mgr2Agent.get('/api/issues');
        expect(res.status).toBe(200);
        const found = res.body.find((i: any) => i.id === issueId);
        expect(found).toBeUndefined();
    });
});
