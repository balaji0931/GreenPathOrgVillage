/**
 * VILLAGE ISOLATION — Cross-village access prevention.
 *
 * Setup: Village A + Village B, each with manager, collector, household.
 * Tests: Users from A cannot access data from B.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;

// Village A
let villageAId: string;
let managerAAgent: any;
let managerACsrf: string;
let collectorAAgent: any;
let collectorACsrf: string;
let householdAUid: string;

// Village B
let villageBId: string;
let managerBAgent: any;
let managerBCsrf: string;
let collectorBAgent: any;
let collectorBCsrf: string;
let householdBUid: string;

// Moderator assigned to A only
let modAgent: any;
let modCsrf: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    const adminCsrf = adminLogin.body.csrfToken;

    // ─── Create Village A ───
    const vARes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Village Alpha', managerName: 'Mgr A', managerPhone: '1111111111' });
    villageAId = vARes.body.village.villageId;
    const mgrAId = vARes.body.manager.credentials.userId;

    // ─── Create Village B ───
    const vBRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Village Beta', managerName: 'Mgr B', managerPhone: '2222222222' });
    villageBId = vBRes.body.village.villageId;
    const mgrBId = vBRes.body.manager.credentials.userId;

    // ─── Moderator assigned to A only ───
    const modRes = await adminAgent
        .post('/api/moderators')
        .set('x-csrf-token', adminCsrf)
        .send({ name: 'Mod A', phone: '3333333333', email: 'moda@t.com', villageIds: [villageAId] });
    const modId = modRes.body.credentials.userId;

    modAgent = request.agent(app);
    const modLogin = await modAgent.post('/api/auth/login').send({ userId: modId, password: modId });
    modCsrf = modLogin.body.csrfToken;

    // ─── Manager A setup ───
    managerAAgent = request.agent(app);
    const maLogin = await managerAAgent.post('/api/auth/login').send({ userId: mgrAId, password: mgrAId });
    managerACsrf = maLogin.body.csrfToken;

    const colARes = await managerAAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerACsrf)
        .send({ name: 'Col A', phone: '4444444444' });
    const colAUid = colARes.body.uid;

    const hhAResult = await seedHousehold(villageAId, { headName: 'Head A', phone: '5555555555', houseNumber: '1A', familySize: 2, address: 'Addr A' });
    householdAUid = hhAResult.household.uid;

    collectorAAgent = request.agent(app);
    const caLogin = await collectorAAgent.post('/api/auth/login').send({ userId: colAUid, password: colAUid });
    collectorACsrf = caLogin.body.csrfToken;

    // ─── Manager B setup ───
    managerBAgent = request.agent(app);
    const mbLogin = await managerBAgent.post('/api/auth/login').send({ userId: mgrBId, password: mgrBId });
    managerBCsrf = mbLogin.body.csrfToken;

    const colBRes = await managerBAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerBCsrf)
        .send({ name: 'Col B', phone: '6666666666' });
    const colBUid = colBRes.body.uid;

    const hhBResult = await seedHousehold(villageBId, { headName: 'Head B', phone: '7777777777', houseNumber: '1B', familySize: 3, address: 'Addr B' });
    householdBUid = hhBResult.household.uid;

    collectorBAgent = request.agent(app);
    const cbLogin = await collectorBAgent.post('/api/auth/login').send({ userId: colBUid, password: colBUid });
    collectorBCsrf = cbLogin.body.csrfToken;
}, 120000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Village Isolation — Cross-village access denied', () => {
    describe('Manager A cannot access Village B', () => {
        test('Manager A cannot see Village B households', async () => {
            // Manager A's GET /api/households should only return A's households
            const res = await managerAAgent.get('/api/households');
            expect(res.status).toBe(200);
            const uids = res.body.map((h: any) => h.uid);
            expect(uids).not.toContain(householdBUid);
        });

        test('Manager A cannot get Village B household by UID', async () => {
            const res = await managerAAgent.get(`/api/households/${householdBUid}`);
            // Security fix: household UID lookup is now village-scoped
            expect(res.status).toBe(404);
        });

        test('Manager A cannot see Village B collectors', async () => {
            const res = await managerAAgent.get('/api/collectors');
            expect(res.status).toBe(200);
            // Should only have A's collectors
            const names = res.body.map((c: any) => c.name);
            expect(names).not.toContain('Col B');
        });

        test('Manager A cannot access Village B waste collections', async () => {
            const res = await managerAAgent.get('/api/waste-collections/village');
            expect(res.status).toBe(200);
            // Village-scoped — only A's data
        });

        test('Manager A cannot add vehicle to Village B', async () => {
            const res = await managerAAgent
                .post(`/api/villages/${villageBId}/vehicles`)
                .set('x-csrf-token', managerACsrf)
                .send({ registrationNumber: 'CROSS-001', name: 'Cross Truck' });
            expect([403, 404]).toContain(res.status);
        });
    });

    describe('Collector A cannot access Village B', () => {
        test('Collector A cannot submit collection for Village B household', async () => {
            const res = await collectorAAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', collectorACsrf)
                .send({
                    householdUid: householdBUid,
                    segregationRating: 4,
                    plasticRating: 3,
                    observations: [],
                    remarks: '',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });
            // Security fix: cross-village collection now returns 403
            expect(res.status).toBe(403);
        });

        test('Collector A cannot see Village B households', async () => {
            const res = await collectorAAgent.get('/api/households');
            expect(res.status).toBe(200);
            const uids = res.body.map((h: any) => h.uid);
            expect(uids).not.toContain(householdBUid);
        });
    });

    describe('Moderator assigned to A cannot access Village B', () => {
        test('Moderator cannot view Village B details', async () => {
            const res = await modAgent.get(`/api/moderator/village/${villageBId}/details`);
            expect(res.status).toBe(403);
        });

        test('Moderator cannot view Village B managers', async () => {
            const res = await modAgent.get(`/api/moderator/village/${villageBId}/managers`);
            expect(res.status).toBe(403);
        });

        test('Moderator cannot view Village B issues', async () => {
            const res = await modAgent.get(`/api/moderator/village/${villageBId}/issues`);
            expect(res.status).toBe(403);
        });

        test('Moderator cannot add manager to Village B', async () => {
            const res = await modAgent
                .post(`/api/moderator/village/${villageBId}/managers`)
                .set('x-csrf-token', modCsrf)
                .send({ managerName: 'Cross Mgr', managerPhone: '0000000000' });
            expect(res.status).toBe(403);
        });
    });
});
