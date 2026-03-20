/**
 * QR MAPPING LIFECYCLE — QR state machine tests.
 *
 * notMapped → mapped, re-map blocked, cross-village blocked, PDF, credential validity.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any, adminCsrf: string;
let managerAgent: any, managerCsrf: string;
let fieldworkerAgent: any, fieldworkerCsrf: string;
let villageId: string;
let village2Id: string;
let qrCodes: any[];
let batchId: string;

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

    // Village 1
    const v1Res = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'QR Village', managerName: 'QR Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = v1Res.body.village.villageId;
    const mgrId = v1Res.body.manager.credentials.userId;

    // Village 2 (for cross-village test)
    const v2Res = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Other Village', managerName: 'Other Mgr', paymentsEnabled: true, managerPhone: '6666666666' });
    village2Id = v2Res.body.village.villageId;

    // Manager login
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: mgrId, password: mgrId });
    managerCsrf = mLogin.body.csrfToken;

    // Create fieldworker
    const fwRes = await managerAgent
        .post('/api/fieldworkers')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'QR Fieldworker', phone: '2222222222' });
    const fwUid = fwRes.body.userId;

    fieldworkerAgent = request.agent(app);
    const fwLogin = await fieldworkerAgent
        .post('/api/auth/login')
        .send({ userId: fwUid, password: fwUid });
    fieldworkerCsrf = fwLogin.body.csrfToken;

    // Create QR batch
    const batchRes = await managerAgent
        .post('/api/qr-codes/batch')
        .set('x-csrf-token', managerCsrf)
        .send({ quantity: 2 });
    qrCodes = batchRes.body.qrCodes;
    batchId = batchRes.body.batchId;
}, 60000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('QR Mapping Lifecycle', () => {
    let mappedHouseholdUid: string;
    let genUserId: string;
    let genPassword: string;

    test('1. All QR codes start as notMapped', () => {
        expect(qrCodes.length).toBe(2);
        for (const qr of qrCodes) {
            expect(qr.status).toBe('notMapped');
        }
    });

    test('2. Fieldworker validates QR → returns QR data', async () => {
        const uid = qrCodes[0].uid;
        const res = await fieldworkerAgent.get(`/api/qr-codes/${uid}`);
        expect(res.status).toBe(200);
        expect(res.body.uid).toBeDefined();
        expect(res.body.status).toBe('notMapped');
    });

    test('3. Fieldworker maps QR #1 → household created, status mapped', async () => {
        const uid = qrCodes[0].uid;
        const res = await fieldworkerAgent
            .post(`/api/qr-codes/${uid}/map`)
            .set('x-csrf-token', fieldworkerCsrf)
            .send({
                headName: 'QR Map Head',
                phone: '3333333333',
                houseNumber: '10',
                ward: 'Ward-1',
                familySize: 3,
                address: 'QR Street',
            });

        expect(res.status).toBe(200);
        expect(res.body.household).toBeDefined();
        expect(res.body.credentials).toBeDefined();

        mappedHouseholdUid = res.body.household.uid;
        genUserId = res.body.credentials.userId;
        genPassword = genUserId; // Convention: password = userId for generated accounts
    });

    test('4. QR status persisted as mapped', async () => {
        const uid = qrCodes[0].uid;
        const res = await fieldworkerAgent.get(`/api/qr-codes/${uid}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('mapped');
    });

    test('5. Re-map same QR → 400 already mapped', async () => {
        const uid = qrCodes[0].uid;
        const res = await fieldworkerAgent
            .post(`/api/qr-codes/${uid}/map`)
            .set('x-csrf-token', fieldworkerCsrf)
            .send({
                headName: 'Duplicate Head',
                phone: '7777777777',
                houseNumber: '99',
            });

        expect(res.status).toBe(400);
    });

    test('6. Generator credentials are valid (login succeeds)', async () => {
        const genAgent = request.agent(app);
        const res = await genAgent
            .post('/api/auth/login')
            .send({ userId: genUserId, password: genPassword });

        expect(res.status).toBe(200);
    });

    test('7. Collector collects from QR-created household → 200', async () => {
        // Create collector
        const colRes = await managerAgent
            .post('/api/collectors')
            .set('x-csrf-token', managerCsrf)
            .send({ name: 'QR Collector', phone: '4444444444' });
        const colUid = colRes.body.uid;

        const colAgent = request.agent(app);
        const colLogin = await colAgent
            .post('/api/auth/login')
            .send({ userId: colUid, password: colUid });
        const colCsrf = colLogin.body.csrfToken;

        const res = await colAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', colCsrf)
            .send({
                householdUid: mappedHouseholdUid,
                segregationRating: 4,
                remarks: '',
                photoUrl: '',
                voiceUrl: '',
                status: 'collected',
                missedReason: '',
            });

        expect(res.status).toBe(200);
    });

    test('8. Fieldworker maps QR #2 (different data) → success', async () => {
        const uid = qrCodes[1].uid;
        const res = await fieldworkerAgent
            .post(`/api/qr-codes/${uid}/map`)
            .set('x-csrf-token', fieldworkerCsrf)
            .send({
                headName: 'Second Mapped',
                phone: '8888888888',
                houseNumber: '20',
            });

        expect(res.status).toBe(200);
        expect(res.body.household).toBeDefined();
    });

    test('9. Fieldworker from different village cannot map QR', async () => {
        // Create fieldworker for village 2
        const mgr2Id = (await adminAgent
            .post('/api/villages')
            .set('x-csrf-token', adminCsrf)
            .send({ villageName: 'FW Cross Village', managerName: 'Cross Mgr', paymentsEnabled: true, managerPhone: '9191919191' }))
            .body.manager.credentials.userId;

        const mgr2Agent = request.agent(app);
        const m2Login = await mgr2Agent
            .post('/api/auth/login')
            .send({ userId: mgr2Id, password: mgr2Id });
        const m2Csrf = m2Login.body.csrfToken;

        const fw2Res = await mgr2Agent
            .post('/api/fieldworkers')
            .set('x-csrf-token', m2Csrf)
            .send({ name: 'Cross FW', phone: '9292929292' });

        const fw2Agent = request.agent(app);
        const fw2Login = await fw2Agent
            .post('/api/auth/login')
            .send({ userId: fw2Res.body.userId, password: fw2Res.body.userId });
        const fw2Csrf = fw2Login.body.csrfToken;

        // Create new batch in village 1
        const newBatch = await managerAgent
            .post('/api/qr-codes/batch')
            .set('x-csrf-token', managerCsrf)
            .send({ quantity: 1 });
        const crossQrUid = newBatch.body.qrCodes[0].uid;

        // Village 2 fieldworker tries to map village 1 QR
        const res = await fw2Agent
            .post(`/api/qr-codes/${crossQrUid}/map`)
            .set('x-csrf-token', fw2Csrf)
            .send({ headName: 'Cross Head', phone: '9393939393', houseNumber: '99' });

        expect(res.status).toBe(403);
    });

    test('10. QR batch PDF endpoint returns buffer', async () => {
        const res = await managerAgent.get(`/api/qr-codes/batch/${batchId}/pdf`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/pdf');
    });
});
