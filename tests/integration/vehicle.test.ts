import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any;
let managerCsrf: string;
let villageId: string;

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

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Vehicle Village', managerName: 'V Manager', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = villageRes.body.village.villageId;
    const managerId = villageRes.body.manager.credentials.userId;

    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Vehicle Integration', () => {
    const regNumber = 'KA-01-AB-1234';

    describe('POST /api/villages/:villageId/vehicles', () => {
        test('adds vehicle to village', async () => {
            const res = await managerAgent
                .post(`/api/villages/${villageId}/vehicles`)
                .set('x-csrf-token', managerCsrf)
                .send({ registrationNumber: regNumber, name: 'Truck 1', collectorIds: [] });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('added');
        });

        test('rejects vehicle without registration', async () => {
            const res = await managerAgent
                .post(`/api/villages/${villageId}/vehicles`)
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'No Reg' });

            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/villages/:villageId/vehicles/:regNumber', () => {
        test('updates vehicle', async () => {
            const res = await managerAgent
                .patch(`/api/villages/${villageId}/vehicles/${regNumber}`)
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'Updated Truck', collectorIds: [] });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('updated');
        });
    });

    describe('DELETE /api/villages/:villageId/vehicles/:regNumber', () => {
        test('removes vehicle', async () => {
            const res = await managerAgent
                .delete(`/api/villages/${villageId}/vehicles/${regNumber}`)
                .set('x-csrf-token', managerCsrf);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('removed');
        });
    });
});
