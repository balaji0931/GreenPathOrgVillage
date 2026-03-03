/**
 * DELETION CASCADES — Verify manual cascade integrity.
 *
 * Household deletion: removes collections, feedback, QR codes. NOT collector.
 * Collector deletion: preserves historical collections. Removes user record.
 * Village deletion: removes ALL related entities. Admin NOT deleted.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';
import { Pool } from 'pg';

let app: any;
let adminAgent: any, adminCsrf: string;
let pool: Pool;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    pool = new Pool({
        connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
        ssl: (process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || '').includes('sslmode=require')
            ? { rejectUnauthorized: false } : false,
        max: 2,
    });

    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;
}, 30000);

afterAll(async () => {
    await pool.end();
    await closeCleanupPool();
});

describe('Deletion Cascades', () => {
    describe('Household Deletion', () => {
        let villageId: string;
        let householdId: number;
        let householdUid: string;
        let collectorUid: string;
        let managerAgent: any;
        let managerCsrf: string;

        beforeAll(async () => {
            // Create village
            const vRes = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: 'HH Delete Village', managerName: 'HHD Mgr', managerPhone: '1111111111' });
            villageId = vRes.body.village.villageId;
            const mgrId = vRes.body.manager.credentials.userId;

            managerAgent = request.agent(app);
            const mLogin = await managerAgent
                .post('/api/auth/login')
                .send({ userId: mgrId, password: mgrId });
            managerCsrf = mLogin.body.csrfToken;

            // Seed household
            const hh = await seedHousehold(villageId, {
                headName: 'Delete Me Head',
                phone: '3333333333',
                houseNumber: '1',
                familySize: 2,
                address: 'Delete St',
            });
            householdId = hh.household.id;
            householdUid = hh.household.uid;

            // Create collector
            const colRes = await managerAgent
                .post('/api/collectors')
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'HHD Collector', phone: '4444444444' });
            collectorUid = colRes.body.uid;

            // Collector submits collection
            const colAgent = request.agent(app);
            const cLogin = await colAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });
            const colCsrf = cLogin.body.csrfToken;

            await colAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', colCsrf)
                .send({
                    householdUid,
                    segregationRating: 4,
                    plasticRating: 3,
                    observations: [],
                    remarks: '',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });
        }, 60000);

        test('1. Delete household → 200', async () => {
            const res = await managerAgent
                .delete(`/api/households/${householdId}`)
                .set('x-csrf-token', managerCsrf);
            expect(res.status).toBe(200);
        });

        test('2. Waste collections for deleted household → gone', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM waste_collections WHERE household_id = $1',
                [householdId]
            );
            expect(parseInt(result.rows[0].count)).toBe(0);
        });

        test('3. QR codes for deleted household → gone', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM qr_codes WHERE household_id = $1',
                [householdId]
            );
            expect(parseInt(result.rows[0].count)).toBe(0);
        });

        test('4. Feedback for deleted household → gone', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM feedback WHERE from_household_id = $1',
                [householdId]
            );
            expect(parseInt(result.rows[0].count)).toBe(0);
        });

        test('5. Collector still exists', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM collectors WHERE uid = $1',
                [collectorUid]
            );
            expect(parseInt(result.rows[0].count)).toBe(1);
        });

        test('6. Village still exists', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM villages WHERE village_id = $1',
                [villageId]
            );
            expect(parseInt(result.rows[0].count)).toBe(1);
        });
    });

    describe('Collector Deletion (No API Route)', () => {
        let villageId: string;
        let collectorId: number;
        let collectorUid: string;
        let householdUid: string;
        let managerAgent: any;
        let managerCsrf: string;

        beforeAll(async () => {
            const vRes = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: 'Col Delete Village', managerName: 'CD Mgr', managerPhone: '5555555555' });
            villageId = vRes.body.village.villageId;
            const mgrId = vRes.body.manager.credentials.userId;

            managerAgent = request.agent(app);
            const mLogin = await managerAgent
                .post('/api/auth/login')
                .send({ userId: mgrId, password: mgrId });
            managerCsrf = mLogin.body.csrfToken;

            // Seed household + collector + collection
            const hh = await seedHousehold(villageId, {
                headName: 'Col Del HH Head',
                phone: '6666666666',
                houseNumber: '5',
            });
            householdUid = hh.household.uid;

            const colRes = await managerAgent
                .post('/api/collectors')
                .set('x-csrf-token', managerCsrf)
                .send({ name: 'Delete Me Col', phone: '7777777777' });
            collectorUid = colRes.body.uid;
            collectorId = colRes.body.id;

            const colAgent = request.agent(app);
            const cLogin = await colAgent
                .post('/api/auth/login')
                .send({ userId: collectorUid, password: collectorUid });
            const colCsrf = cLogin.body.csrfToken;

            await colAgent
                .post('/api/waste-collections')
                .set('x-csrf-token', colCsrf)
                .send({
                    householdUid,
                    segregationRating: 5,
                    plasticRating: 5,
                    observations: [],
                    remarks: '',
                    photoUrl: '',
                    voiceUrl: '',
                    status: 'collected',
                    missedReason: '',
                });
        }, 60000);

        test('7. No DELETE /api/collectors/:id route → 404 (documented)', async () => {
            // DISCOVERY: No DELETE endpoint for collectors exists in the API.
            // Collectors are only removed via village cascade deletion.
            const res = await managerAgent
                .delete(`/api/collectors/${collectorId}`)
                .set('x-csrf-token', managerCsrf);
            expect(res.status).toBe(404);
        });

        test('8. Waste collections reference collector (data preserved)', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM waste_collections WHERE collector_id = $1',
                [collectorId]
            );
            expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(1);
        });

        test('9. Collector record still exists (no cascade without village delete)', async () => {
            const result = await pool.query(
                'SELECT COUNT(*) FROM collectors WHERE uid = $1',
                [collectorUid]
            );
            expect(parseInt(result.rows[0].count)).toBe(1);
        });
    });

    describe('Village Deletion', () => {
        let villageId: string;

        beforeAll(async () => {
            // Create village with full data
            const vRes = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: 'VDel Village', managerName: 'VDel Mgr', managerPhone: '8888888888' });
            villageId = vRes.body.village.villageId;
            const mgrId = vRes.body.manager.credentials.userId;

            const mgrAgent = request.agent(app);
            const mLogin = await mgrAgent
                .post('/api/auth/login')
                .send({ userId: mgrId, password: mgrId });
            const mgrCsrf = mLogin.body.csrfToken;

            // Create collector, household, issue, announcement
            await mgrAgent.post('/api/collectors')
                .set('x-csrf-token', mgrCsrf)
                .send({ name: 'VDel Col', phone: '9999999999' });

            await seedHousehold(villageId, {
                headName: 'VDel HH', phone: '1010101010', houseNumber: '1',
            });

            await mgrAgent.post('/api/announcements')
                .set('x-csrf-token', mgrCsrf)
                .send({ message: 'VDel Announcement', targetAudience: 'all' });
        }, 60000);

        test('10. Delete village → 200', async () => {
            const res = await adminAgent
                .delete(`/api/villages/${villageId}`)
                .set('x-csrf-token', adminCsrf);
            expect(res.status).toBe(200);
        });

        test('11. All related entities removed', async () => {
            const checks = [
                { table: 'households', col: 'village_id' },
                { table: 'collectors', col: 'village_id' },
                { table: 'issues', col: 'village_id' },
                { table: 'announcements', col: 'village_id' },
            ];

            for (const { table, col } of checks) {
                const result = await pool.query(
                    `SELECT COUNT(*) FROM ${table} WHERE ${col} = $1`,
                    [villageId]
                );
                expect(parseInt(result.rows[0].count)).toBe(0);
            }
        });

        test('12. Admin user NOT deleted', async () => {
            const result = await pool.query(
                "SELECT COUNT(*) FROM users WHERE role = 'admin'"
            );
            expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(1);
        });
    });
});
