import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any;
let managerCsrf: string;
let managerId: string;

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
        .send({ villageName: 'Profile Village', managerName: 'Profile Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    managerId = villageRes.body.manager.credentials.userId;

    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Profile Integration', () => {
    describe('PUT /api/profile', () => {
        test('updates name', async () => {
            const res = await managerAgent
                .put('/api/profile')
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('updated');
        });

        test('changes password with valid current password', async () => {
            const res = await managerAgent
                .put('/api/profile')
                .set('x-csrf-token', managerCsrf)
                .send({
                    currentPassword: managerId,
                    newPassword: 'NewPass123!',
                });

            expect(res.status).toBe(200);

            // Verify login with new password
            const freshAgent = request.agent(app);
            const loginRes = await freshAgent
                .post('/api/auth/login')
                .send({ userId: managerId, password: 'NewPass123!' });
            expect(loginRes.status).toBe(200);

            // Restore password
            const csrf2 = loginRes.body.csrfToken;
            await freshAgent
                .put('/api/profile')
                .set('x-csrf-token', csrf2)
                .send({ currentPassword: 'NewPass123!', newPassword: managerId });
        });

        test('rejects wrong current password', async () => {
            const res = await managerAgent
                .put('/api/profile')
                .set('x-csrf-token', managerCsrf)
                .send({
                    currentPassword: 'wrong-password',
                    newPassword: 'NewPass123!',
                });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain('incorrect');
        });
    });
});
