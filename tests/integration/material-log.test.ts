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
        .send({ villageName: 'ML Village', managerName: 'ML Manager', managerPhone: '1111111111' });
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

describe('Material Log Integration', () => {
    let dailyWasteLogId: number;
    let compostLogId: number;
    let dryWasteSaleId: number;

    describe('Daily Waste Log', () => {
        test('creates daily waste log', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await managerAgent
                .post('/api/material-log/daily-waste')
                .set('x-csrf-token', managerCsrf)
                .send({
                    date: today,
                    wetWasteKg: '10.5',
                    dryWasteKg: '5.2',
                    rejectedWasteKg: '1.0',
                    sanitaryWasteKg: '0.5',
                    remarks: 'Normal day',
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            dailyWasteLogId = res.body.id;
        });

        test('gets daily waste logs', async () => {
            const res = await managerAgent.get('/api/material-log/daily-waste');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });

        test('gets daily waste log by date', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await managerAgent.get(`/api/material-log/daily-waste/${today}`);
            expect(res.status).toBe(200);
        });

        test('updates daily waste log', async () => {
            const res = await managerAgent
                .patch(`/api/material-log/daily-waste/${dailyWasteLogId}`)
                .set('x-csrf-token', managerCsrf)
                .send({ wetWasteKg: '15.0', remarks: 'Updated' });

            expect(res.status).toBe(200);
        });

        test('deletes daily waste log', async () => {
            const res = await managerAgent
                .delete(`/api/material-log/daily-waste/${dailyWasteLogId}`)
                .set('x-csrf-token', managerCsrf);

            expect(res.status).toBe(200);
        });

        test('returns filtered by date range', async () => {
            const res = await managerAgent.get(
                '/api/material-log/daily-waste?startDate=2025-01-01&endDate=2026-12-31'
            );
            expect(res.status).toBe(200);
        });
    });

    describe('Compost Log', () => {
        test('creates compost log', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await managerAgent
                .post('/api/material-log/compost')
                .set('x-csrf-token', managerCsrf)
                .send({
                    date: today,
                    quantityKg: '25.0',
                    compostStatus: 'good',
                    photoUrl: 'https://test.cloudinary.com/compost.jpg',
                    remarks: 'Quality compost',
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            compostLogId = res.body.id;
        });

        test('gets compost logs', async () => {
            const res = await managerAgent.get('/api/material-log/compost');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('deletes compost log', async () => {
            const res = await managerAgent
                .delete(`/api/material-log/compost/${compostLogId}`)
                .set('x-csrf-token', managerCsrf);

            expect(res.status).toBe(200);
        });
    });

    describe('Dry Waste Sales', () => {
        test('creates dry waste sale', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await managerAgent
                .post('/api/material-log/dry-waste-sales')
                .set('x-csrf-token', managerCsrf)
                .send({
                    saleDate: today,
                    remarks: 'Monthly sale',
                    materials: [
                        { materialType: 'Plastic', quantityKg: '10', ratePerKg: '15', amount: '150' },
                        { materialType: 'Paper', quantityKg: '5', ratePerKg: '8', amount: '40' },
                    ],
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            dryWasteSaleId = res.body.id;
        });

        test('gets dry waste sales', async () => {
            const res = await managerAgent.get('/api/material-log/dry-waste-sales');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('deletes dry waste sale', async () => {
            const res = await managerAgent
                .delete(`/api/material-log/dry-waste-sales/${dryWasteSaleId}`)
                .set('x-csrf-token', managerCsrf);

            expect(res.status).toBe(200);
        });
    });
});
