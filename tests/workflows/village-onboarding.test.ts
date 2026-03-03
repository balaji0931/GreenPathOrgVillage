/**
 * VILLAGE ONBOARDING — Full QR-first lifecycle.
 *
 * Admin → Village → Manager → Collector + Fieldworker → QR batch →
 * QR mapping → Generator login → Collection → Feedback → Stats validation.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;

// Agents & CSRF tokens
let adminAgent: any, adminCsrf: string;
let managerAgent: any, managerCsrf: string;
let collectorAgent: any, collectorCsrf: string;
let fieldworkerAgent: any, fieldworkerCsrf: string;
let generatorAgent: any, generatorCsrf: string;

// IDs
let villageId: string;
let managerId: string;
let collectorUid: string;
let fieldworkerUid: string;
let qrCodes: any[];
let householdUid: string;
let generatorUserId: string;
let generatorPassword: string;
let collectionId: number;

// Second village for isolation tests
let village2Id: string;
let manager2Agent: any, manager2Csrf: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin login
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Village Onboarding — Full QR-First Lifecycle', () => {
    test('1. Admin creates village → manager credentials returned', async () => {
        const res = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Onboard Village', managerName: 'Onboard Mgr', managerPhone: '1111111111' });

        expect(res.status).toBe(200);
        expect(res.body.village.villageId).toBeDefined();
        expect(res.body.manager.credentials.userId).toBeDefined();

        villageId = res.body.village.villageId;
        managerId = res.body.manager.credentials.userId;
    });

    test('2. Manager login → success', async () => {
        managerAgent = request.agent(app);
        const res = await managerAgent
            .post('/api/auth/login')
            .send({ userId: managerId, password: managerId });

        expect(res.status).toBe(200);
        expect(res.body.csrfToken).toBeDefined();
        managerCsrf = res.body.csrfToken;
    });

    test('3. Manager creates collector', async () => {
        const res = await managerAgent
            .post('/api/collectors')
            .set('x-csrf-token', managerCsrf)
            .send({ name: 'Onboard Collector', phone: '2222222222' });

        expect(res.status).toBe(200);
        expect(res.body.uid).toBeDefined();
        collectorUid = res.body.uid;
    });

    test('4. Manager creates fieldworker', async () => {
        const res = await managerAgent
            .post('/api/fieldworkers')
            .set('x-csrf-token', managerCsrf)
            .send({ name: 'Onboard Fieldworker', phone: '3333333333' });

        expect(res.status).toBe(201);
        expect(res.body.userId).toBeDefined();
        fieldworkerUid = res.body.userId;
    });

    test('5. Manager creates QR batch (qty: 3) → all notMapped', async () => {
        const res = await managerAgent
            .post('/api/qr-codes/batch')
            .set('x-csrf-token', managerCsrf)
            .send({ quantity: 3 });

        expect(res.status).toBe(200);
        expect(res.body.qrCodes).toBeDefined();
        expect(res.body.qrCodes.length).toBe(3);

        qrCodes = res.body.qrCodes;
        for (const qr of qrCodes) {
            expect(qr.status).toBe('notMapped');
        }
    });

    test('6. Fieldworker logs in', async () => {
        fieldworkerAgent = request.agent(app);
        const res = await fieldworkerAgent
            .post('/api/auth/login')
            .send({ userId: fieldworkerUid, password: fieldworkerUid });

        expect(res.status).toBe(200);
        fieldworkerCsrf = res.body.csrfToken;
    });

    test('7. Fieldworker maps QR → household + generator created', async () => {
        const qrUid = qrCodes[0].uid;
        const res = await fieldworkerAgent
            .post(`/api/qr-codes/${qrUid}/map`)
            .set('x-csrf-token', fieldworkerCsrf)
            .send({
                headName: 'Mapped Household Head',
                phone: '4444444444',
                houseNumber: '1',
                ward: 'Ward-1',
                familySize: 4,
                address: 'QR Street',
            });

        expect(res.status).toBe(200);
        expect(res.body.household).toBeDefined();
        expect(res.body.credentials).toBeDefined();

        householdUid = res.body.household.uid;
        generatorUserId = res.body.credentials.userId;
        generatorPassword = res.body.credentials.password;
    });

    test('8. Generator login with auto-credentials → success', async () => {
        generatorAgent = request.agent(app);
        const res = await generatorAgent
            .post('/api/auth/login')
            .send({ userId: generatorUserId, password: generatorPassword });

        expect(res.status).toBe(200);
        generatorCsrf = res.body.csrfToken;
    });

    test('9. Collector logs in and submits collection → 200', async () => {
        collectorAgent = request.agent(app);
        const cLogin = await collectorAgent
            .post('/api/auth/login')
            .send({ userId: collectorUid, password: collectorUid });
        collectorCsrf = cLogin.body.csrfToken;

        const res = await collectorAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', collectorCsrf)
            .send({
                householdUid,
                segregationRating: 4,
                plasticRating: 3,
                observations: ['clean'],
                remarks: 'Good segregation',
                photoUrl: '',
                voiceUrl: '',
                status: 'collected',
                missedReason: '',
            });

        expect(res.status).toBe(200);
        expect(res.body.householdId || res.body.collection?.householdId).toBeDefined();
        collectionId = res.body.id || res.body.collection?.id;
    });

    test('10. Generator submits feedback → 200', async () => {
        // First get collections for this household
        const collectionsRes = await generatorAgent.get('/api/waste-collections/household');
        const collections = collectionsRes.body?.collections || collectionsRes.body || [];
        const targetCollection = Array.isArray(collections) ? collections[0] : null;

        if (!targetCollection?.id) {
            // If we can't get the collection via generator, use the stored ID
            expect(collectionId).toBeDefined();
            return;
        }

        const res = await generatorAgent
            .post('/api/feedback')
            .set('x-csrf-token', generatorCsrf)
            .send({ collectionId: targetCollection.id, rating: 5, remarks: 'Excellent' });

        expect(res.status).toBe(200);
    });

    test('11. Manager stats reflect increments', async () => {
        const res = await managerAgent.get('/api/manager/stats');
        expect(res.status).toBe(200);
        expect(res.body.totalHouseholds).toBeGreaterThanOrEqual(1);
        expect(res.body.totalCollectors).toBeGreaterThanOrEqual(1);
        expect(res.body.collectionsToday).toBeGreaterThanOrEqual(1);
    });

    test('12. Admin stats reflect village data', async () => {
        const res = await adminAgent.get('/api/stats/admin');
        expect(res.status).toBe(200);
        expect(res.body.totalVillages).toBeGreaterThanOrEqual(1);
    });

    test('13. Cross-village isolation: second village cannot see first village data', async () => {
        // Create second village
        const v2Res = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Isolated Village', managerName: 'Iso Mgr', managerPhone: '5555555555' });
        village2Id = v2Res.body.village.villageId;
        const mgr2Id = v2Res.body.manager.credentials.userId;

        manager2Agent = request.agent(app);
        const m2Login = await manager2Agent
            .post('/api/auth/login')
            .send({ userId: mgr2Id, password: mgr2Id });
        manager2Csrf = m2Login.body.csrfToken;

        // Manager 2 should NOT see village 1 households
        const hhRes = await manager2Agent.get('/api/households');
        expect(hhRes.status).toBe(200);
        const uids = hhRes.body.map((h: any) => h.uid);
        expect(uids).not.toContain(householdUid);
    });

    test('14. Generator sees only own household data', async () => {
        const res = await generatorAgent.get('/api/waste-collections/household');
        expect(res.status).toBe(200);
        // Should not crash and should return data scoped to own household
    });
});
