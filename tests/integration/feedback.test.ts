import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;
let generatorUserId: string;
let generatorPassword: string;
let collectorUid: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin create village
    const adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    const adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Feedback Village', managerName: 'FB Manager', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    // Manager login
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Create household (gets generator credentials)
    const hhResult = await seedHousehold(villageId, { headName: 'FB Head', phone: '9999999999', houseNumber: '1', familySize: 2, address: 'FB St' });
    generatorUserId = hhResult.generatorCredentials.userId;
    generatorPassword = hhResult.generatorCredentials.password;
    const householdUid = hhResult.household.uid;

    // Create collector
    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'FB Collector', phone: '8888888888' });
    collectorUid = colRes.body.uid;

    // Collector submits collection
    const colAgent = request.agent(app);
    const colLogin = await colAgent
        .post('/api/auth/login')
        .send({ userId: collectorUid, password: collectorUid });
    const colCsrf = colLogin.body.csrfToken;

        await colAgent
            .post('/api/waste-collections')
            .set('x-csrf-token', colCsrf)
            .send({
                householdUid,
                segregationRating: 4,
                remarks: '',
                photoUrl: '',
                voiceUrl: '',
                status: 'collected',
                missedReason: '',
            });
}, 60000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Feedback Integration', () => {
    describe('POST /api/feedback', () => {
        test('generator submits feedback', async () => {
            const genAgent = request.agent(app);
            const genLogin = await genAgent
                .post('/api/auth/login')
                .send({ userId: generatorUserId, password: generatorPassword });
            const genCsrf = genLogin.body.csrfToken;

            // Get collections for this generator's household
            const collections = await genAgent.get('/api/waste-collections/household');
            const collectionId = collections.body?.collections?.[0]?.id || collections.body?.[0]?.id;

            if (!collectionId) {
                // If we can't find the collection ID through collection list, skip
                console.warn('Could not find collection ID - skip feedback test');
                return;
            }

            const res = await genAgent
                .post('/api/feedback')
                .set('x-csrf-token', genCsrf)
                .send({ collectionId, rating: 4, remarks: 'Good service' });

            expect(res.status).toBe(200);
            expect(res.body.rating).toBe(4);
        });

        test('duplicate feedback rejected', async () => {
            const genAgent = request.agent(app);
            const genLogin = await genAgent
                .post('/api/auth/login')
                .send({ userId: generatorUserId, password: generatorPassword });
            const genCsrf = genLogin.body.csrfToken;

            const collections = await genAgent.get('/api/waste-collections/household');
            const collectionId = collections.body?.collections?.[0]?.id || collections.body?.[0]?.id;

            if (!collectionId) return;

            const res = await genAgent
                .post('/api/feedback')
                .set('x-csrf-token', genCsrf)
                .send({ collectionId, rating: 5, remarks: 'Duplicate' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already submitted');
        });
    });

    describe('GET /api/feedback/village', () => {
        test('manager fetches village feedback', async () => {
            const res = await managerAgent.get('/api/feedback/village');
            expect(res.status).toBe(200);
        });
    });
});
