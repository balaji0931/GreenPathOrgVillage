/**
 * STRESS EDGE CASES — Boundary conditions, rapid operations, partial failures.
 *
 * Empty datasets, massive payloads, rapid login/logout, delete-then-operate.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any, adminCsrf: string;

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
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Stress Edge Cases', () => {
    // ─── Empty Dataset ───
    test('1. Empty village: manager stats return zeros, not 500', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Empty Stats Village', managerName: 'Empty Mgr', managerPhone: '1111111111' });
        const mgrId = vRes.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });

        const res = await mgrAgent.get('/api/manager/stats');
        expect(res.status).toBe(200);
        expect(res.body.totalHouseholds).toBe(0);
        expect(res.body.totalCollectors).toBe(0);
    });



    test('3. Empty village: pagination returns empty data + total 0', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Empty Pagination Village', managerName: 'EP Mgr', managerPhone: '2222222222' });
        const mgrId = vRes.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });

        const res = await mgrAgent.get('/api/households/paginated?page=1&limit=10');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
    });

    // ─── Rapid Login/Logout ───
    test('4. Rapid login/logout cycles (5x) → no session leakage', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Rapid Login Village', managerName: 'RL Mgr', managerPhone: '3333333333' });
        const mgrId = vRes.body.manager.credentials.userId;

        for (let i = 0; i < 5; i++) {
            const agent = request.agent(app);
            const login = await agent
                .post('/api/auth/login')
                .send({ userId: mgrId, password: mgrId });
            expect(login.status).toBe(200);

            const csrf = login.body.csrfToken;
            const logout = await agent
                .post('/api/auth/logout')
                .set('x-csrf-token', csrf);
            expect(logout.status).toBe(200);
        }

        // After all logout cycles, unauthenticated access must fail
        const freshAgent = request.agent(app);
        const res = await freshAgent.get('/api/households');
        expect(res.status).toBe(401);
    });

    // ─── Delete Then Operate ───
    test('5. Delete household → attempt collection → 404', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Del Then Op Village', managerName: 'DTO Mgr', managerPhone: '4444444444' });
        const villageId = vRes.body.village.villageId;
        const mgrId = vRes.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mgrCsrf = mLogin.body.csrfToken;

        const hh = await seedHousehold(villageId, {
            headName: 'DTO Head', phone: '5555555555', houseNumber: '1',
        });

        const colRes = await mgrAgent
            .post('/api/collectors')
            .set('x-csrf-token', mgrCsrf)
            .send({ name: 'DTO Col', phone: '6666666666' });

        const colAgent = request.agent(app);
        const cLogin = await colAgent
            .post('/api/auth/login')
            .send({ userId: colRes.body.uid, password: colRes.body.uid });
        const colCsrf = cLogin.body.csrfToken;

        // Delete household
        await mgrAgent
            .delete(`/api/households/${hh.household.id}`)
            .set('x-csrf-token', mgrCsrf);

        // Attempt collection on deleted household
        const res = await colAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', colCsrf)
            .send({
                householdUid: hh.household.uid,
                segregationRating: 4, plasticRating: 3,
                observations: [], remarks: '', photoUrl: '', voiceUrl: '',
                status: 'collected', missedReason: '',
            });
        expect(res.status).toBe(404);
    });

    // ─── Massive Payload ───
    test('6. Massive payload rejected (not 500)', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Payload Village', managerName: 'PL Mgr', managerPhone: '7777777777' });
        const mgrId = vRes.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mgrCsrf = mLogin.body.csrfToken;

        const bigPayload = {
            title: 'A'.repeat(100000),
            description: 'B'.repeat(100000),
            category: 'waste',
        };

        const res = await mgrAgent
            .post('/api/issues')
            .set('x-csrf-token', mgrCsrf)
            .send(bigPayload);

        // Should not crash — either 400 (validated) or 200 (accepted)
        expect(res.status).not.toBe(500);
    });

    // ─── Feedback Invalid Collection ───
    test('7. Feedback on non-existent collectionId → proper error', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Bad FB Village', managerName: 'BF Mgr', managerPhone: '8888888888' });
        const villageId = vRes.body.village.villageId;

        const hh = await seedHousehold(villageId, {
            headName: 'Bad FB Head', phone: '9999999999', houseNumber: '1',
        });

        const genAgent = request.agent(app);
        const genLogin = await genAgent
            .post('/api/auth/login')
            .send({ userId: hh.generatorCredentials.userId, password: hh.generatorCredentials.password });
        const genCsrf = genLogin.body.csrfToken;

        const res = await genAgent
            .post('/api/feedback')
            .set('x-csrf-token', genCsrf)
            .send({ collectionId: 999999, rating: 5, remarks: 'test' });

        expect([400, 404, 500]).toContain(res.status);
        // Must not crash silently
    });

    // ─── Create After Delete ───
    test('8. Create village → delete → recreate same name → clean state', async () => {
        const name = 'Recreate Village';

        // Create
        const v1 = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: name, managerName: 'RC Mgr 1', managerPhone: '1010101010' });
        expect(v1.status).toBe(200);
        const vId = v1.body.village.villageId;

        // Delete
        const del = await adminAgent
            .delete(`/api/villages/${vId}`)
            .set('x-csrf-token', adminCsrf);
        expect(del.status).toBe(200);

        // Recreate
        const v2 = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: name, managerName: 'RC Mgr 2', managerPhone: '1212121212' });
        expect(v2.status).toBe(200);
        expect(v2.body.village.villageId).toBeDefined();
    });

    // ─── Minimum Valid Issue ───
    test('9. Create issue with minimum valid data → 200', async () => {
        const vRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Min Issue Village', managerName: 'MI Mgr', managerPhone: '1313131313' });
        const mgrId = vRes.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mgrCsrf = mLogin.body.csrfToken;

        const colRes = await mgrAgent
            .post('/api/collectors')
            .set('x-csrf-token', mgrCsrf)
            .send({ name: 'MI Col', phone: '1414141414' });

        const colAgent = request.agent(app);
        const cLogin = await colAgent
            .post('/api/auth/login')
            .send({ userId: colRes.body.uid, password: colRes.body.uid });
        const colCsrf = cLogin.body.csrfToken;

        const res = await colAgent
            .post('/api/issues')
            .set('x-csrf-token', colCsrf)
            .send({
                title: 'Min issue title',
                description: 'Minimum valid description text for issue',
                category: 'waste',
            });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
    });

    // ─── Login with wrong password ───
    test('10. Login with wrong password → 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ userId: process.env.TEST_ADMIN_USER, password: 'WRONGPASSWORD' });
        expect(res.status).toBe(401);
    });
});
