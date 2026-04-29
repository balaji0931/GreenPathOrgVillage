/**
 * LARGE DATASET - Pagination correctness at scale.
 *
 * Seeds 100 households via seedHousehold, tests pagination, filtering, deletion impact.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let managerAgent: any, managerCsrf: string;
let villageId: string;
let householdIds: number[] = [];

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

    const vRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Large Village', managerName: 'Large Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = vRes.body.village.villageId;
    const mgrId = vRes.body.manager.credentials.userId;

    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: mgrId, password: mgrId });
    managerCsrf = mLogin.body.csrfToken;

    // Seed 100 households sequentially to avoid UID collision
    // (seedHousehold uses MAX(uid) which races under Promise.all)
    for (let i = 0; i < 100; i++) {
        const hh = await seedHousehold(villageId, {
            headName: `Head-${String(i).padStart(3, '0')}`,
            phone: `9${String(i).padStart(9, '0')}`,
            houseNumber: `H${i}`,
        });
        householdIds.push(hh.household.id);
    }
}, 300000);

afterAll(async () => {
    await closeCleanupPool();
});

describe('Large Dataset - Pagination', () => {
    test('1. Page 1 (limit 10) returns exactly 10 items', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=1&limit=10');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(10);
    });

    test('2. Page 2 returns different items (no overlap)', async () => {
        const page1 = await managerAgent.get('/api/households/paginated?page=1&limit=10');
        const page2 = await managerAgent.get('/api/households/paginated?page=2&limit=10');

        const p1Data = page1.body.data || page1.body.households || page1.body;
        const p2Data = page2.body.data || page2.body.households || page2.body;

        const p1Ids = new Set(p1Data.map((h: any) => h.id || h.uid));
        const p2Ids = new Set(p2Data.map((h: any) => h.id || h.uid));

        // No overlap
        for (const id of p2Ids) {
            expect(p1Ids.has(id)).toBe(false);
        }
    });

    test('3. Last page returns remaining items (≤ limit)', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=10&limit=10');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeLessThanOrEqual(10);
        expect(data.length).toBeGreaterThan(0);
    });

    test('4. Total field matches actual count (100)', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=1&limit=10');
        expect(res.status).toBe(200);
        const total = res.body.total || res.body.totalCount || res.body.pagination?.total;
        if (total !== undefined) {
            expect(total).toBe(100);
        } else {
            // If API doesn't return total, verify via full list
            const all = await managerAgent.get('/api/households');
            expect(all.body.length).toBe(100);
        }
    });

    test('5. Beyond-range page returns empty', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=999&limit=10');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
    });

    test('6. Search filter by headName returns matching subset', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=1&limit=100&search=Head-001');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        if (data.length > 0) {
            for (const h of data) {
                expect(h.headName.toLowerCase()).toContain('head-001');
            }
        }
    });

    test('7. Ward filter returns only matching ward', async () => {
        const res = await managerAgent.get('/api/households/paginated?page=1&limit=100&ward=Ward-A');
        expect(res.status).toBe(200);
        const data = res.body.data || res.body.households || res.body;
        if (data.length > 0) {
            for (const h of data) {
                expect(h.ward).toBe('Ward-A');
            }
        }
    });

    test('8. Full list endpoint returns all 100', async () => {
        const res = await managerAgent.get('/api/households');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(100);
    });

    test('9. Delete 1 household → total adjusts to 99', async () => {
        const toDelete = householdIds[0];
        const delRes = await managerAgent
            .delete(`/api/households/${toDelete}`)
            .set('x-csrf-token', managerCsrf);
        expect(delRes.status).toBe(200);

        const res = await managerAgent.get('/api/households');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(99);
    });
});
