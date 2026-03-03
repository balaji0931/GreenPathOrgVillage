import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let collectorAgent: any;
let collectorCsrf: string;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;
let householdUid: string;
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
        .send({ villageName: 'WC Village', managerName: 'WC Manager', managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    // Login as manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Create household
    const hhResult = await seedHousehold(villageId, { headName: 'WC Head', phone: '9999999999', houseNumber: '1', familySize: 3, address: 'WC St' });
    householdUid = hhResult.household.uid;

    // Create collector
    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'WC Collector', phone: '8888888888' });
    collectorUid = colRes.body.uid;

    // Login as collector
    collectorAgent = request.agent(app);
    const cLogin = await collectorAgent
        .post('/api/auth/login')
        .send({ userId: collectorUid, password: collectorUid });
    collectorCsrf = cLogin.body.csrfToken;
}, 60000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Waste Collection Integration', () => {
    describe('POST /api/waste-collections', () => {
        test('submits collection successfully', async () => {
            const res = await collectorAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', collectorCsrf)
                .send({
                    householdUid,
                    segregationRating: 4,
                    plasticRating: 3,
                    observations: ['clean'],
                    remarks: 'Good',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });

            expect(res.status).toBe(200);
            expect(res.body.householdId).toBeDefined();
        });

        test('returns 409 for duplicate collection same day', async () => {
            const res = await collectorAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', collectorCsrf)
                .send({
                    householdUid,
                    segregationRating: 5,
                    plasticRating: 5,
                    observations: [],
                    remarks: '',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('already recorded');
        });

        test('returns 404 for non-existent household', async () => {
            const res = await collectorAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', collectorCsrf)
                .send({
                    householdUid: 'NONEXISTENT',
                    segregationRating: 3,
                    plasticRating: 3,
                    observations: [],
                    remarks: '',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/waste-collections/household/:uid', () => {
        test('returns collections for household', async () => {
            const res = await collectorAgent.get(`/api/waste-collections/household/${householdUid}`);
            expect(res.status).toBe(200);
        });

        test('returns 404 for non-existent household', async () => {
            const res = await collectorAgent.get('/api/waste-collections/household/NONEXIST');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/waste-collections/collector', () => {
        test('returns collections for logged-in collector', async () => {
            const res = await collectorAgent.get('/api/waste-collections/collector');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('GET /api/waste-collections/village', () => {
        test('returns collections for village (manager)', async () => {
            const res = await managerAgent.get('/api/waste-collections/village');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/collections/daily-summary', () => {
        test('returns daily summary for village (manager)', async () => {
            const res = await managerAgent.get('/api/collections/daily-summary');
            expect(res.status).toBe(200);
        });
    });
});
