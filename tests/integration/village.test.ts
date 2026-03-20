import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let csrfToken: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);
    adminAgent = request.agent(app);

    // Login as admin
    const loginRes = await adminAgent
        .post('/api/auth/login')
        .send({
            userId: process.env.TEST_ADMIN_USER,
            password: process.env.TEST_ADMIN_PASSWORD,
        });
    csrfToken = loginRes.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Village Integration', () => {
    let createdVillageId: string;

    describe('POST /api/villages', () => {
        test('creates village with manager', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', csrfToken)
                .send({
                    villageName: 'Test Village',
                    managerName: 'Test Manager',
                    paymentsEnabled: true, managerPhone: '9876543210',
                });

            expect(res.status).toBe(200);
            expect(res.body.village).toBeDefined();
            expect(res.body.village.name).toBe('Test Village');
            expect(res.body.manager).toBeDefined();
            expect(res.body.manager.credentials).toBeDefined();
            createdVillageId = res.body.village.villageId;
        });

        test('creates second village', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', csrfToken)
                .send({
                    villageName: 'Second Village',
                    managerName: 'Manager Two',
                    paymentsEnabled: true, managerPhone: '1234567890',
                });

            expect(res.status).toBe(200);
            expect(res.body.village.villageId).not.toBe(createdVillageId);
        });
    });

    describe('GET /api/villages', () => {
        test('returns all villages with stats', async () => {
            const res = await adminAgent.get('/api/villages');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('GET /api/villages/:villageId', () => {
        test('returns a specific village', async () => {
            const res = await adminAgent.get(`/api/villages/${createdVillageId}`);
            expect(res.status).toBe(200);
            expect(res.body.villageId).toBe(createdVillageId);
            expect(res.body.name).toBe('Test Village');
        });

        test('returns 404 for non-existent village', async () => {
            const res = await adminAgent.get('/api/villages/V999');
            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/villages/:villageId', () => {
        test('updates village', async () => {
            const res = await adminAgent
                .put(`/api/villages/${createdVillageId}`)
                .set('x-csrf-token', csrfToken)
                .send({ name: 'Updated Village Name' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('updated');
        });
    });

    describe('Ward CRUD', () => {
        test('adds ward to village', async () => {
            // Login as manager for this village
            const managerAgent = request.agent(app);
            const managerLogin = await managerAgent
                .post('/api/auth/login')
                .send({
                    userId: `${createdVillageId}-M1`,
                    password: `${createdVillageId}-M1`,
                });
            const mCsrf = managerLogin.body.csrfToken;

            const res = await managerAgent
                .post(`/api/villages/${createdVillageId}/wards`)
                .set('x-csrf-token', mCsrf)
                .send({ ward: 'Ward-New' });

            expect(res.status).toBe(200);
            expect(res.body.wards).toContain('Ward-New');
        });

        test('gets wards for village', async () => {
            const managerAgent = request.agent(app);
            const managerLogin = await managerAgent
                .post('/api/auth/login')
                .send({
                    userId: `${createdVillageId}-M1`,
                    password: `${createdVillageId}-M1`,
                });

            const res = await managerAgent.get(`/api/villages/${createdVillageId}/wards`);
            expect(res.status).toBe(200);
        });

        test('rejects duplicate ward', async () => {
            const managerAgent = request.agent(app);
            const managerLogin = await managerAgent
                .post('/api/auth/login')
                .send({
                    userId: `${createdVillageId}-M1`,
                    password: `${createdVillageId}-M1`,
                });
            const mCsrf = managerLogin.body.csrfToken;

            const res = await managerAgent
                .post(`/api/villages/${createdVillageId}/wards`)
                .set('x-csrf-token', mCsrf)
                .send({ ward: 'Ward-New' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already exists');
        });
    });

    describe('DELETE /api/villages/:villageId', () => {
        test('deletes village', async () => {
            // Create then delete a temporary village
            const createRes = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', csrfToken)
                .send({
                    villageName: 'To Delete',
                    managerName: 'Temp Manager',
                    paymentsEnabled: true, managerPhone: '0000000000',
                });
            const tempVillageId = createRes.body.village.villageId;

            const delRes = await adminAgent
                .delete(`/api/villages/${tempVillageId}`)
                .set('x-csrf-token', csrfToken);

            expect(delRes.status).toBe(200);
            expect(delRes.body.message).toContain('deleted');

            // Verify deleted
            const getRes = await adminAgent.get(`/api/villages/${tempVillageId}`);
            expect(getRes.status).toBe(404);
        });
    });
});
