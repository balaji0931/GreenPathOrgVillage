import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let adminCsrf: string;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;
let managerId: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Login as admin and create a village
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Household Village', managerName: 'HH Manager', managerPhone: '1111111111' });

    villageId = villageRes.body.village.villageId;
    managerId = villageRes.body.manager.credentials.userId;

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

describe('Household Integration', () => {
    let createdHouseholdUid: string;
    let createdHouseholdId: number;

    // Seed households via DB helper (households are now created only via QR flow)
    beforeAll(async () => {
        const hhResult = await seedHousehold(villageId, {
            headName: 'Raju Kumar',
            phone: '9876543210',
            houseNumber: '101',
            familySize: 4,
            address: 'Block A, Street 1',
            ward: 'Ward-1',
        });
        createdHouseholdUid = hhResult.household.uid;
        createdHouseholdId = hhResult.household.id;
    });

    describe('GET /api/households', () => {
        test('returns all households for village', async () => {
            const res = await managerAgent.get('/api/households');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/households/paginated', () => {
        test('returns paginated households', async () => {
            const res = await managerAgent.get('/api/households/paginated?page=1&limit=2');
            expect(res.status).toBe(200);
            expect(res.body.data || res.body.households || res.body).toBeDefined();
        });
    });

    describe('GET /api/households/:uid', () => {
        test('returns household by UID', async () => {
            const res = await managerAgent.get(`/api/households/${createdHouseholdUid}`);
            expect(res.status).toBe(200);
            expect(res.body.uid).toBe(createdHouseholdUid);
            expect(res.body.headName).toBe('Raju Kumar');
        });

        test('returns 404 for non-existent UID', async () => {
            const res = await managerAgent.get('/api/households/NONEXISTENT-UID');
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/households/:id', () => {
        test('deletes household', async () => {
            // Create one to delete
            const toDelete = await seedHousehold(villageId, {
                headName: 'To Delete',
                phone: '0000000000',
                houseNumber: '999',
            });

            const res = await managerAgent
                .delete(`/api/households/${toDelete.household.id}`)
                .set('x-csrf-token', managerCsrf);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted');
        });
    });
});
