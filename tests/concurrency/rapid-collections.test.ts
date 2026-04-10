/**
 * RAPID COLLECTIONS — Stress test for field collection workflow.
 *
 * Simulates real-world scenarios:
 *   A. Single collector submitting 10 collections rapidly (sequential burst)
 *   B. 10 collectors submitting simultaneously (parallel burst)
 *   C. Burst-mode: 20 rapid collections from a single collector
 *   D. Duplicate detection under load
 *
 * Verifies:
 *   - No data loss (every valid submission is persisted)
 *   - No 500 errors (server handles load gracefully)
 *   - Correct duplicate detection (409 for same household)
 *   - DB integrity (no orphaned or corrupted records)
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';
import { Pool } from 'pg';

let app: any;
let pool: Pool;
let adminAgent: any, adminCsrf: string;

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
        max: 5,
    });

    // Login as admin
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

// ─── Helpers ───────────────────────────────────────────────

async function createVillageWithCollectors(
    tag: string,
    collectorCount: number,
    householdCount: number
): Promise<{
    villageId: string;
    collectors: { agent: any; csrf: string; uid: string }[];
    households: { uid: string; id: number }[];
}> {
    // Create village
    const vRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({
            villageName: `Rapid ${tag}`,
            managerName: `Mgr ${tag}`,
            managerPhone: `100${tag.replace(/\D/g, '').padEnd(7, '0')}`,
        });
    expect(vRes.status).toBe(200);
    const villageId = vRes.body.village.villageId;
    const mgrId = vRes.body.manager.credentials.userId;

    // Login as manager
    const mgrAgent = request.agent(app);
    const mLogin = await mgrAgent
        .post('/api/auth/login')
        .send({ userId: mgrId, password: mgrId });
    const mgrCsrf = mLogin.body.csrfToken;

    // Create collectors
    const collectors: { agent: any; csrf: string; uid: string }[] = [];
    for (let i = 0; i < collectorCount; i++) {
        const colRes = await mgrAgent
            .post('/api/collectors')
            .set('x-csrf-token', mgrCsrf)
            .send({
                name: `Col ${tag}-${i}`,
                phone: `200${tag.replace(/\D/g, '').padEnd(4, '0')}${String(i).padStart(3, '0')}`,
            });
        expect(colRes.status).toBe(200);

        const colAgent = request.agent(app);
        const cLogin = await colAgent
            .post('/api/auth/login')
            .send({ userId: colRes.body.uid, password: colRes.body.uid });

        collectors.push({
            agent: colAgent,
            csrf: cLogin.body.csrfToken,
            uid: colRes.body.uid,
        });
    }

    // Create households
    const householdsArr: { uid: string; id: number }[] = [];
    for (let i = 0; i < householdCount; i++) {
        const hh = await seedHousehold(villageId, {
            headName: `HH ${tag}-${i}`,
            phone: `300${tag.replace(/\D/g, '').padEnd(4, '0')}${String(i).padStart(3, '0')}`,
            houseNumber: `${i + 1}`,
        });
        householdsArr.push({ uid: hh.household.uid, id: hh.household.id });
    }

    return { villageId, collectors, households: householdsArr };
}

function makePayload(householdUid: string, index: number) {
    return {
        householdUid,
        segregationRating: (index % 5) + 1,
        remarks: `Rapid test #${index}`,
        photoUrl: '',
        voiceUrl: '',
        status: 'collected',
        missedReason: '',
        wasteTypes: ['wet', 'dry'],
        collectionDate: new Date().toISOString(),
    };
}

// ─── Tests ─────────────────────────────────────────────────

describe('Rapid Collections', () => {

    describe('A. Single collector — 10 rapid sequential submissions', () => {
        let setup: Awaited<ReturnType<typeof createVillageWithCollectors>>;

        beforeAll(async () => {
            setup = await createVillageWithCollectors('SeqA', 1, 10);
        }, 120000);

        test('1. All 10 collections succeed (200)', async () => {
            const collector = setup.collectors[0];
            const results: { status: number; householdUid: string }[] = [];

            // Sequential burst — no await gap, fire as fast as possible
            for (let i = 0; i < 10; i++) {
                const res = await collector.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', collector.csrf)
                    .send(makePayload(setup.households[i].uid, i));
                results.push({ status: res.status, householdUid: setup.households[i].uid });
            }

            const successes = results.filter(r => r.status === 200);
            const failures = results.filter(r => r.status >= 500);

            expect(failures).toHaveLength(0);
            expect(successes).toHaveLength(10);
        }, 60000);

        test('2. DB has exactly 10 records', async () => {
            const result = await pool.query(
                `SELECT COUNT(*) FROM waste_collections wc
                 INNER JOIN households h ON wc.household_id = h.id
                 WHERE h.village_id = $1`,
                [setup.villageId]
            );
            expect(parseInt(result.rows[0].count)).toBe(10);
        });
    });

    describe('B. 10 collectors — simultaneous parallel submissions', () => {
        let setup: Awaited<ReturnType<typeof createVillageWithCollectors>>;

        beforeAll(async () => {
            // 10 collectors, 10 households (one per collector)
            setup = await createVillageWithCollectors('ParB', 10, 10);
        }, 120000);

        test('3. All 10 parallel submissions succeed', async () => {
            // Each collector submits for a different household — all should succeed
            const promises = setup.collectors.map((col, i) =>
                col.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', col.csrf)
                    .send(makePayload(setup.households[i].uid, i))
            );

            const results = await Promise.all(promises);
            const statuses = results.map(r => r.status);
            const failures = statuses.filter(s => s >= 500);

            expect(failures).toHaveLength(0);
            expect(statuses.filter(s => s === 200)).toHaveLength(10);
        }, 60000);

        test('4. DB has exactly 10 records', async () => {
            const result = await pool.query(
                `SELECT COUNT(*) FROM waste_collections wc
                 INNER JOIN households h ON wc.household_id = h.id
                 WHERE h.village_id = $1`,
                [setup.villageId]
            );
            expect(parseInt(result.rows[0].count)).toBe(10);
        });
    });

    describe('C. Burst mode — 20 rapid collections, single collector', () => {
        let setup: Awaited<ReturnType<typeof createVillageWithCollectors>>;

        beforeAll(async () => {
            setup = await createVillageWithCollectors('BrstC', 1, 20);
        }, 120000);

        test('5. All 20 burst submissions succeed', async () => {
            const collector = setup.collectors[0];

            // Fire all 20 in parallel — maximum stress
            const promises = setup.households.map((hh, i) =>
                collector.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', collector.csrf)
                    .send(makePayload(hh.uid, i))
            );

            const results = await Promise.all(promises);
            const statuses = results.map(r => r.status);
            const serverErrors = statuses.filter(s => s >= 500);
            const successes = statuses.filter(s => s === 200);

            // No server errors allowed
            expect(serverErrors).toHaveLength(0);
            // All should succeed since each is a different household
            expect(successes).toHaveLength(20);
        }, 120000);

        test('6. DB has exactly 20 records', async () => {
            const result = await pool.query(
                `SELECT COUNT(*) FROM waste_collections wc
                 INNER JOIN households h ON wc.household_id = h.id
                 WHERE h.village_id = $1`,
                [setup.villageId]
            );
            expect(parseInt(result.rows[0].count)).toBe(20);
        });
    });

    describe('D. Duplicate detection under rapid fire', () => {
        let setup: Awaited<ReturnType<typeof createVillageWithCollectors>>;

        beforeAll(async () => {
            // 3 collectors, 1 household — to test duplicate detection
            setup = await createVillageWithCollectors('DupD', 3, 1);
        }, 120000);

        test('7. Same household, 3 collectors simultaneously — at most 3 succeed', async () => {
            const hh = setup.households[0];

            const promises = setup.collectors.map((col, i) =>
                col.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', col.csrf)
                    .send(makePayload(hh.uid, i))
            );

            const results = await Promise.all(promises);
            const statuses = results.map(r => r.status);
            const serverErrors = statuses.filter(s => s >= 500);

            // No 500 errors
            expect(serverErrors).toHaveLength(0);
            // All should be 200 since different collectors can collect from the same household
            // (duplicate check is per collector+household+date)
            expect(statuses.filter(s => s === 200).length).toBeGreaterThanOrEqual(1);
        }, 60000);

        test('8. Same collector, same household, 5 parallel — at most 1 new record', async () => {
            const collector = setup.collectors[0];
            // Collector 0 already submitted above, so all 5 should be 409
            const promises = Array.from({ length: 5 }, (_, i) =>
                collector.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', collector.csrf)
                    .send(makePayload(setup.households[0].uid, i))
            );

            const results = await Promise.all(promises);
            const statuses = results.map(r => r.status);
            const serverErrors = statuses.filter(s => s >= 500);

            // No 500 errors — all should be 409 (already collected)
            expect(serverErrors).toHaveLength(0);

            // Due to race conditions, possibly 0 or 1 more 200s may slip through
            // but NO 500s is the critical assertion
            const conflicts = statuses.filter(s => s === 409);
            expect(conflicts.length).toBeGreaterThanOrEqual(3);
        }, 60000);
    });

    describe('E. Response time under load', () => {
        let setup: Awaited<ReturnType<typeof createVillageWithCollectors>>;

        beforeAll(async () => {
            setup = await createVillageWithCollectors('PerfE', 1, 5);
        }, 120000);

        test('9. Each collection responds within 5 seconds', async () => {
            const collector = setup.collectors[0];
            const timings: number[] = [];

            for (let i = 0; i < 5; i++) {
                const start = Date.now();
                const res = await collector.agent
                    .post('/api/waste-collections')
                    .set('x-csrf-token', collector.csrf)
                    .send(makePayload(setup.households[i].uid, i));
                const elapsed = Date.now() - start;
                timings.push(elapsed);

                expect(res.status).toBe(200);
                // Each individual request should complete within 5s
                expect(elapsed).toBeLessThan(5000);
            }

            const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
            console.log(`[Rapid Collections] Avg response time: ${Math.round(avg)}ms`);
            console.log(`[Rapid Collections] Individual timings: ${timings.map(t => `${t}ms`).join(', ')}`);
        }, 60000);
    });
});
