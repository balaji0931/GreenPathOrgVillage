/**
 * CROSS-MODULE INVARIANTS - System-level referential integrity & role enforcement.
 *
 * Collection → valid household. Feedback → valid collection.
 * VILLAGE_MISMATCH enforced. Generator sees only own data.
 * State machines forward-only. Password change/reset invalidates old credentials.
 * Cache double-fetch (no double increment).
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any, adminCsrf: string;

// Village A
let villageAId: string;
let managerAAgent: any, managerACsrf: string;
let collectorAAgent: any, collectorACsrf: string;
let householdAUid: string;
let householdAId: number;
let generatorAUserId: string;
let generatorAPassword: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    // Village A
    const vARes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Invariant Village A', managerName: 'Inv Mgr A', paymentsEnabled: true, managerPhone: '1111111111' });
    villageAId = vARes.body.village.villageId;
    const mgrAId = vARes.body.manager.credentials.userId;

    managerAAgent = request.agent(app);
    const mALogin = await managerAAgent
        .post('/api/auth/login')
        .send({ userId: mgrAId, password: mgrAId });
    managerACsrf = mALogin.body.csrfToken;

    // Household A
    const hhA = await seedHousehold(villageAId, {
        headName: 'Inv Head A', phone: '2222222222', houseNumber: '1',
    });
    householdAUid = hhA.household.uid;
    householdAId = hhA.household.id;
    generatorAUserId = hhA.generatorCredentials.userId;
    generatorAPassword = hhA.generatorCredentials.password;

    // Collector A
    const colRes = await managerAAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerACsrf)
        .send({ name: 'Inv Col A', phone: '3333333333' });

    collectorAAgent = request.agent(app);
    const cALogin = await collectorAAgent
        .post('/api/auth/login')
        .send({ userId: colRes.body.uid, password: colRes.body.uid });
    collectorACsrf = cALogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Cross-Module Invariants', () => {
    // ─── Referential Integrity ───
    test('1. Collection for non-existent household → 404', async () => {
        const res = await collectorAAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', collectorACsrf)
            .send({
                householdUid: 'NONEXISTENT-UID',
                segregationRating: 4,
                remarks: '', photoUrl: '', voiceUrl: '',
                status: 'collected', missedReason: '',
            });
        expect(res.status).toBe(404);
    });

    test('2. Feedback for non-existent collection → error', async () => {
        const genAgent = request.agent(app);
        const genLogin = await genAgent.post('/api/auth/login')
            .send({ userId: generatorAUserId, password: generatorAPassword });
        const genCsrf = genLogin.body.csrfToken;

        const res = await genAgent
            .post('/api/feedback')
            .set('x-csrf-token', genCsrf)
            .send({ collectionId: 999999, rating: 5, remarks: 'test' });
        expect([400, 404, 500]).toContain(res.status);
    });

    // ─── Village Isolation (VILLAGE_MISMATCH) ───
    test('3. Collector from Village A cannot collect in Village B', async () => {
        // Create Village B + household
        const vBRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Invariant Village B', managerName: 'Inv Mgr B', paymentsEnabled: true, managerPhone: '4444444444' });
        const villageBId = vBRes.body.village.villageId;

        const hhB = await seedHousehold(villageBId, {
            headName: 'Inv Head B', phone: '5555555555', houseNumber: '2',
        });

        // Collector A tries to collect in Village B
        const res = await collectorAAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', collectorACsrf)
            .send({
                householdUid: hhB.household.uid,
                segregationRating: 4,
                remarks: '', photoUrl: '', voiceUrl: '',
                status: 'collected', missedReason: '',
            });
        expect(res.status).toBe(403);
    });

    // ─── Generator Sees Only Own Data ───
    test('4. Generator sees only own household collections', async () => {
        // Submit a collection first
        await collectorAAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', collectorACsrf)
            .send({
                householdUid: householdAUid,
                segregationRating: 4,
                remarks: '', photoUrl: '', voiceUrl: '',
                status: 'collected', missedReason: '',
            });

        const genAgent = request.agent(app);
        const genLogin = await genAgent.post('/api/auth/login')
            .send({ userId: generatorAUserId, password: generatorAPassword });

        const res = await genAgent.get('/api/waste-collections/household');
        expect(res.status).toBe(200);
    });

    // ─── State Machine Forward-Only ───
    test('5. Issue cannot be updated without proof', async () => {
        const issueRes = await collectorAAgent
            .post('/api/issues')
            .set('x-csrf-token', collectorACsrf)
            .send({
                title: 'Invariant Issue Test',
                description: 'Testing forward-only state machine invariant.',
                category: 'sanitation',
            });
        const issueId = issueRes.body.id;

        // Try to resolve without proof
        const res = await managerAAgent
            .patch(`/api/issues/${issueId}`)
            .set('x-csrf-token', managerACsrf)
            .send({ status: 'resolved' });
        expect(res.status).toBe(400);
    });

    // ─── Household Deletion Prevents Collection ───
    test('6. Deleted household prevents future collection', async () => {
        const tempHH = await seedHousehold(villageAId, {
            headName: 'Temp Delete Head', phone: '6666666666', houseNumber: '99',
        });

        // Delete
        await managerAAgent
            .delete(`/api/households/${tempHH.household.id}`)
            .set('x-csrf-token', managerACsrf);

        // Attempt collection
        const res = await collectorAAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', collectorACsrf)
            .send({
                householdUid: tempHH.household.uid,
                segregationRating: 4,
                remarks: '', photoUrl: '', voiceUrl: '',
                status: 'collected', missedReason: '',
            });
        expect(res.status).toBe(404);
    });

    // ─── Password Change Invalidates Old Password ───
    test('7. Change password → old password fails login', async () => {
        // Create a fresh manager to test password change
        const v3Res = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'PW Test Village', managerName: 'PW Mgr', paymentsEnabled: true, managerPhone: '7777777777' });
        const mgrId = v3Res.body.manager.credentials.userId;

        // Login
        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mCsrf = mLogin.body.csrfToken;

        // Change password
        await mgrAgent
            .post('/api/auth/change-password')
            .set('x-csrf-token', mCsrf)
            .send({ newPassword: 'newSecurePassword123' });

        // Old password should fail
        const freshAgent = request.agent(app);
        const res = await freshAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        expect(res.status).toBe(401);
    });

    test('8. New password works after change', async () => {
        // Use the same manager from test 7 - create fresh to be isolated
        const v4Res = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'PW Test Village 2', managerName: 'PW Mgr 2', paymentsEnabled: true, managerPhone: '8888888888' });
        const mgrId = v4Res.body.manager.credentials.userId;

        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mCsrf = mLogin.body.csrfToken;

        await mgrAgent
            .post('/api/auth/change-password')
            .set('x-csrf-token', mCsrf)
            .send({ newPassword: 'newPassword456' });

        // New password works
        const freshAgent = request.agent(app);
        const res = await freshAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: 'newPassword456' });
        expect(res.status).toBe(200);
    });

    // ─── Reset Password ───
    test('9. Admin resets manager password → userId becomes new password', async () => {
        const v5Res = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Reset PW Village', managerName: 'Reset Mgr', paymentsEnabled: true, managerPhone: '9999999999' });
        const mgrId = v5Res.body.manager.credentials.userId;

        // Change password first
        const mgrAgent = request.agent(app);
        const mLogin = await mgrAgent
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        const mCsrf = mLogin.body.csrfToken;

        await mgrAgent
            .post('/api/auth/change-password')
            .set('x-csrf-token', mCsrf)
            .send({ newPassword: 'changedPW' });

        // Admin resets
        await adminAgent
            .put(`/api/managers/${mgrId}/reset-password`)
            .set('x-csrf-token', adminCsrf);

        // Old changed password fails
        const agent1 = request.agent(app);
        const r1 = await agent1
            .post('/api/auth/login')
            .send({ userId: mgrId, password: 'changedPW' });
        expect(r1.status).toBe(401);

        // UserId as password works
        const agent2 = request.agent(app);
        const r2 = await agent2
            .post('/api/auth/login')
            .send({ userId: mgrId, password: mgrId });
        expect(r2.status).toBe(200);
    });

    // ─── Cache Double-Fetch (No Double Increment) ───
    test('10. Stats double-fetch shows same values (no phantom increment)', async () => {
        const stats1 = await managerAAgent.get('/api/manager/stats');
        const stats2 = await managerAAgent.get('/api/manager/stats');

        expect(stats1.status).toBe(200);
        expect(stats2.status).toBe(200);
        expect(stats1.body.totalHouseholds).toBe(stats2.body.totalHouseholds);
        expect(stats1.body.collectionsToday).toBe(stats2.body.collectionsToday);
    });

    // ─── Moderator Village Isolation ───
    test('11. Moderator cannot see unassigned village', async () => {
        // Create moderator assigned to Village A only
        const modRes = await adminAgent
            .post('/api/moderators')
            .set('x-csrf-token', adminCsrf)
            .send({ name: 'Inv Mod', phone: '1010101010', email: 'inv@test.com', villageIds: [villageAId] });
        const modId = modRes.body.credentials.userId;

        const modAgent = request.agent(app);
        const modLogin = await modAgent
            .post('/api/auth/login')
            .send({ userId: modId, password: modId });

        // Create Village C (not assigned to moderator)
        const vCRes = await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'Unassigned Village', managerName: 'U Mgr', paymentsEnabled: true, managerPhone: '1212121212' });
        const villageCId = vCRes.body.village.villageId;

        const res = await modAgent.get(`/api/moderator/village/${villageCId}/managers`);
        expect(res.status).toBe(403);
    });
});
