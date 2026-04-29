/**
 * CSRF SWEEP - Every mutating endpoint tested for CSRF enforcement.
 *
 * For every POST/PUT/PATCH/DELETE:
 *   ✓ Valid CSRF token → success (not 403)
 *   ✗ Missing token → 403
 *   ✗ Invalid token → 403
 *
 * Public endpoints (login, contact, website-feedback) are exempt.
 */
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
let collectorAgent: any;
let collectorCsrf: string;
let villageId: string;
let householdUid: string;
let collectorUid: string;

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

    // Create village
    const vRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'CSRF Village', managerName: 'CSRF Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = vRes.body.village.villageId;
    const managerId = vRes.body.manager.credentials.userId;

    // Manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Create collector + household
    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'CSRF Col', phone: '3333333333' });
    collectorUid = colRes.body.uid;

    const hhResult = await seedHousehold(villageId, { headName: 'CSRF Head', phone: '5555555555', houseNumber: '1', familySize: 2, address: 'CSRF St' });
    householdUid = hhResult.household.uid;

    // Collector
    collectorAgent = request.agent(app);
    const cLogin = await collectorAgent
        .post('/api/auth/login')
        .send({ userId: collectorUid, password: collectorUid });
    collectorCsrf = cLogin.body.csrfToken;
}, 60000);

afterAll(async () => {
    await closeCleanupPool();
});

// ─── Endpoint definitions for CSRF testing ───
// Paths use closures to resolve dynamic values at test time (after beforeAll)
interface CsrfEndpoint {
    method: 'post' | 'put' | 'patch' | 'delete';
    getPath: () => string;
    getBody: () => any;
    agent: () => any;
    csrf: () => string;
    label: string;
}

const CSRF_ENDPOINTS: CsrfEndpoint[] = [
    // Admin POST endpoints
    { method: 'post', getPath: () => '/api/villages', getBody: () => ({ villageName: 'TempV', managerName: 'TempM', paymentsEnabled: true, managerPhone: '0000000000' }), agent: () => adminAgent, csrf: () => adminCsrf, label: 'POST /api/villages (admin)' },
    { method: 'post', getPath: () => '/api/moderators', getBody: () => ({ name: 'TempMod', phone: '0000000001', email: 't@t.com', villageIds: [] }), agent: () => adminAgent, csrf: () => adminCsrf, label: 'POST /api/moderators (admin)' },

    // Manager POST endpoints
    { method: 'post', getPath: () => '/api/collectors', getBody: () => ({ name: 'CSRF Col2', phone: '8888888888' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'POST /api/collectors (manager)' },
    { method: 'post', getPath: () => '/api/announcements', getBody: () => ({ message: 'CSRF announcement', targetAudience: 'all' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'POST /api/announcements (manager)' },
    { method: 'post', getPath: () => '/api/fieldworkers', getBody: () => ({ name: 'CSRF FW', phone: '7777777777' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'POST /api/fieldworkers (manager)' },
    { method: 'post', getPath: () => `/api/villages/${villageId}/vehicles`, getBody: () => ({ registrationNumber: 'CSRF-REG-001', name: 'CSRF Truck' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'POST /api/villages/:villageId/vehicles (manager)' },
    { method: 'post', getPath: () => '/api/material-log/daily-waste', getBody: () => ({ date: '2025-01-01', wetWasteKg: '1', dryWasteKg: '1' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'POST /api/material-log/daily-waste (manager)' },

    // Collector POST - issues created by collector
    { method: 'post', getPath: () => '/api/issues', getBody: () => ({ title: 'CSRF Issue Title Long Enough', description: 'CSRF issue description that is long enough to pass validation', category: 'waste' }), agent: () => collectorAgent, csrf: () => collectorCsrf, label: 'POST /api/issues (collector)' },

    // Collector POST - waste collection
    { method: 'post', getPath: () => '/api/waste-collections', getBody: () => ({ householdUid, segregationRating: 4, remarks: '', photoUrl: '', voiceUrl: '', status: 'collected', missedReason: '' }), agent: () => collectorAgent, csrf: () => collectorCsrf, label: 'POST /api/waste-collections (collector)' },

    // Admin PUT
    { method: 'put', getPath: () => `/api/villages/${villageId}`, getBody: () => ({ name: 'CSRF Updated' }), agent: () => adminAgent, csrf: () => adminCsrf, label: 'PUT /api/villages/:villageId (admin)' },

    // Profile PUT (any auth)
    { method: 'put', getPath: () => '/api/profile', getBody: () => ({ name: 'CSRF Name' }), agent: () => managerAgent, csrf: () => managerCsrf, label: 'PUT /api/profile (manager)' },
];

// ─── Public endpoints exempt from CSRF ───
const PUBLIC_ENDPOINTS = [
    { method: 'post' as const, path: '/api/auth/login', body: { userId: 'test', password: 'test' }, label: 'POST /api/auth/login' },
    { method: 'post' as const, path: '/api/website-feedback', body: { name: 'T', email: 't@t.com', feedbackType: 'general', message: 'Test CSRF exempt feedback message long enough' }, label: 'POST /api/website-feedback' },
    { method: 'post' as const, path: '/api/contact', body: { name: 'T', email: 't@t.com', subject: 'CSRF Test Subject', message: 'Test CSRF exempt contact message long enough' }, label: 'POST /api/contact' },
];

describe('CSRF Sweep - Every Mutation', () => {
    for (const ep of CSRF_ENDPOINTS) {
        describe(ep.label, () => {
            test('missing CSRF token → 403', async () => {
                const agentRef = ep.agent();
                const path = ep.getPath();
                const res = await agentRef[ep.method](path).send(ep.getBody());
                expect(res.status).toBe(403);
            });

            test('invalid CSRF token → 403', async () => {
                const agentRef = ep.agent();
                const path = ep.getPath();
                const res = await agentRef[ep.method](path)
                    .set('x-csrf-token', 'invalid-token-value-here')
                    .send(ep.getBody());
                expect(res.status).toBe(403);
            });

            test('valid CSRF token → not 403', async () => {
                const agentRef = ep.agent();
                const csrf = ep.csrf();
                const path = ep.getPath();
                const res = await agentRef[ep.method](path)
                    .set('x-csrf-token', csrf)
                    .send(ep.getBody());
                // Should not be 403 (may be 200, 201, 400, 409, etc. depending on data state)
                expect(res.status).not.toBe(403);
            });
        });
    }

    describe('Public endpoints - CSRF exempt', () => {
        for (const pub of PUBLIC_ENDPOINTS) {
            test(`${pub.label} works without CSRF token`, async () => {
                const freshAgent = request.agent(app);
                const res = await freshAgent[pub.method](pub.path).send(pub.body);
                expect(res.status).not.toBe(403);
            });
        }
    });
});
