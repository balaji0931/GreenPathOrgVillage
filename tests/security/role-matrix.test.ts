/**
 * ROLE MATRIX — Full Declarative Security Sweep
 *
 * Tests every protected endpoint × every role.
 * Generates tests programmatically from a declarative permission map.
 *
 * Roles: admin, moderator, manager, fieldworker, collector, generator, unauthenticated
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, seedHousehold, closeCleanupPool } from '../helpers/cleanup';

let app: any;

// Agent + CSRF per role
const agents: Record<string, any> = {};
const csrfTokens: Record<string, string> = {};
let villageId: string;
let managerId: string;
let collectorUid: string;
let fieldworkerUid: string;
let generatorUserId: string;
let moderatorId: string;
let householdUid: string;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // --- ADMIN ---
    agents.admin = request.agent(app);
    const adminLogin = await agents.admin
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    csrfTokens.admin = adminLogin.body.csrfToken;

    // Create village
    const vRes = await agents.admin
        .post('/api/villages')
        .set('x-csrf-token', csrfTokens.admin)
        .send({ villageName: 'Matrix Village', managerName: 'Matrix Mgr', paymentsEnabled: true, managerPhone: '1111111111' });
    villageId = vRes.body.village.villageId;
    managerId = vRes.body.manager.credentials.userId;

    // Create moderator
    const modRes = await agents.admin
        .post('/api/moderators')
        .set('x-csrf-token', csrfTokens.admin)
        .send({ name: 'Matrix Mod', phone: '2222222222', email: 'matmod@t.com', villageIds: [villageId] });
    moderatorId = modRes.body.credentials.userId;

    // --- MANAGER ---
    agents.manager = request.agent(app);
    const mLogin = await agents.manager
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    csrfTokens.manager = mLogin.body.csrfToken;

    // Create collector
    const colRes = await agents.manager
        .post('/api/collectors')
        .set('x-csrf-token', csrfTokens.manager)
        .send({ name: 'Matrix Col', phone: '3333333333' });
    collectorUid = colRes.body.uid;

    // Create fieldworker
    const fwRes = await agents.manager
        .post('/api/fieldworkers')
        .set('x-csrf-token', csrfTokens.manager)
        .send({ name: 'Matrix FW', phone: '4444444444' });
    fieldworkerUid = fwRes.body.userId;

    // Create household → generator (via DB helper)
    const hhResult = await seedHousehold(villageId, { headName: 'Matrix Head', phone: '5555555555', houseNumber: '1', familySize: 3, address: 'Matrix St' });
    householdUid = hhResult.household.uid;
    generatorUserId = hhResult.generatorCredentials.userId;
    const generatorPassword = hhResult.generatorCredentials.password;

    // --- MODERATOR ---
    agents.moderator = request.agent(app);
    const modLogin = await agents.moderator
        .post('/api/auth/login')
        .send({ userId: moderatorId, password: moderatorId });
    csrfTokens.moderator = modLogin.body.csrfToken;

    // --- COLLECTOR ---
    agents.collector = request.agent(app);
    const cLogin = await agents.collector
        .post('/api/auth/login')
        .send({ userId: collectorUid, password: collectorUid });
    csrfTokens.collector = cLogin.body.csrfToken;

    // --- FIELDWORKER ---
    agents.fieldworker = request.agent(app);
    const fwLogin = await agents.fieldworker
        .post('/api/auth/login')
        .send({ userId: fieldworkerUid, password: fieldworkerUid });
    csrfTokens.fieldworker = fwLogin.body.csrfToken;

    // --- GENERATOR ---
    agents.generator = request.agent(app);
    const gLogin = await agents.generator
        .post('/api/auth/login')
        .send({ userId: generatorUserId, password: generatorPassword });
    csrfTokens.generator = gLogin.body.csrfToken;

    // --- UNAUTHENTICATED ---
    agents.unauthenticated = request.agent(app);
}, 120000);

afterAll(async () => {
    await closeCleanupPool();
});

// ─── Permission Matrix ─────────────────────────────────────────
type RoleExpect = 'allow' | 'deny';
type RoleMap = Record<string, RoleExpect>;

interface EndpointSpec {
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    pathTemplate: string; // Uses :villageId / :householdUid placeholders
    body?: any;
    roles: RoleMap;
    label: string;
}

const ROLES = ['admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator', 'unauthenticated'] as const;

function allow(...allowedRoles: string[]): RoleMap {
    const map: RoleMap = {};
    for (const role of ROLES) {
        map[role] = allowedRoles.includes(role) ? 'allow' : 'deny';
    }
    return map;
}

// Resolve placeholders at test time
function resolvePath(template: string): string {
    return template
        .replace(':villageId', villageId)
        .replace(':householdUid', householdUid);
}

// Static endpoint list — paths use placeholders resolved at test time
const ENDPOINTS: EndpointSpec[] = [
    // ─── Village (admin only for list) ───
    { method: 'get', pathTemplate: '/api/villages', label: 'GET /api/villages', roles: allow('admin') },
    { method: 'put', pathTemplate: '/api/villages/:villageId', label: 'PUT /api/villages/:id', body: { name: 'Test' }, roles: allow('admin') },

    // ─── Household (manager + collector scoped by village) ───
    { method: 'get', pathTemplate: '/api/households', label: 'GET /api/households', roles: allow('manager', 'collector') },
    { method: 'get', pathTemplate: '/api/households/paginated', label: 'GET /api/households/paginated', roles: allow('manager', 'collector') },

    // ─── Collector (manager only for list) ───
    { method: 'get', pathTemplate: '/api/collectors', label: 'GET /api/collectors', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/collectors/stats/:villageId', label: 'GET /api/collectors/stats', roles: allow('manager') },

    // ─── Waste Collections ───
    { method: 'get', pathTemplate: '/api/waste-collections/collector', label: 'GET /api/waste-collections/collector', roles: allow('collector') },
    { method: 'get', pathTemplate: '/api/waste-collections/village', label: 'GET /api/waste-collections/village', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/collections/daily-summary', label: 'GET /api/collections/daily-summary', roles: allow('manager') },

    // ─── Issue (requireAuth only — all authenticated roles can read) ───
    { method: 'get', pathTemplate: '/api/issues', label: 'GET /api/issues', roles: allow('admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator') },
    { method: 'get', pathTemplate: '/api/issues/paginated', label: 'GET /api/issues/paginated', roles: allow('admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator') },

    // ─── Announcement (all auth roles can read) ───
    { method: 'get', pathTemplate: '/api/announcements', label: 'GET /api/announcements', roles: allow('admin', 'moderator', 'manager', 'collector', 'fieldworker', 'generator') },
    { method: 'get', pathTemplate: '/api/admin/announcements', label: 'GET /api/admin/announcements', roles: allow('admin') },

    // ─── Feedback ───
    { method: 'get', pathTemplate: '/api/feedback/village', label: 'GET /api/feedback/village', roles: allow('manager') },

    // ─── Admin Users ───
    { method: 'get', pathTemplate: '/api/moderators', label: 'GET /api/moderators', roles: allow('admin') },
    { method: 'get', pathTemplate: '/api/managers', label: 'GET /api/managers', roles: allow('admin') },

    // ─── Stats ───
    { method: 'get', pathTemplate: '/api/manager/stats', label: 'GET /api/manager/stats', roles: allow('manager') },


    { method: 'get', pathTemplate: '/api/stats/village', label: 'GET /api/stats/village', roles: allow('manager') },

    { method: 'get', pathTemplate: '/api/analytics/premium', label: 'GET /api/analytics/premium', roles: allow('manager', 'admin') },

    // ─── Admin ───
    { method: 'get', pathTemplate: '/api/admin/website-feedback', label: 'GET /api/admin/website-feedback', roles: allow('admin') },
    { method: 'get', pathTemplate: '/api/admin/contact-submissions', label: 'GET /api/admin/contact-submissions', roles: allow('admin') },

    // ─── Moderator ───
    { method: 'get', pathTemplate: '/api/moderator/villages', label: 'GET /api/moderator/villages', roles: allow('moderator') },
    { method: 'get', pathTemplate: '/api/moderator/issues', label: 'GET /api/moderator/issues', roles: allow('moderator') },
    { method: 'get', pathTemplate: '/api/moderator/collectors', label: 'GET /api/moderator/collectors', roles: allow('moderator') },
    { method: 'get', pathTemplate: '/api/moderator/households', label: 'GET /api/moderator/households', roles: allow('moderator') },
    { method: 'get', pathTemplate: '/api/moderator/managers', label: 'GET /api/moderator/managers', roles: allow('moderator') },


    { method: 'get', pathTemplate: '/api/moderator/village/:villageId/managers', label: 'GET /api/moderator/village/:id/managers', roles: allow('moderator') },

    // ─── Fieldworker ───
    { method: 'get', pathTemplate: '/api/fieldworkers', label: 'GET /api/fieldworkers', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/qr-codes', label: 'GET /api/qr-codes', roles: allow('manager') },

    // ─── Material Log (manager only) ───
    { method: 'get', pathTemplate: '/api/material-log/daily-waste', label: 'GET /api/material-log/daily-waste', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/material-log/compost', label: 'GET /api/material-log/compost', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/material-log/dry-waste-sales', label: 'GET /api/material-log/dry-waste-sales', roles: allow('manager') },

    // ─── Payment / Billing (manager + generator where applicable) ───
    { method: 'get', pathTemplate: '/api/household-types', label: 'GET /api/household-types', roles: allow('manager', 'fieldworker', 'collector') },
    { method: 'get', pathTemplate: '/api/payments/fee-config', label: 'GET /api/payments/fee-config', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/cycles', label: 'GET /api/payments/cycles', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/bills', label: 'GET /api/payments/bills', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/summary', label: 'GET /api/payments/summary', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/gateway/status', label: 'GET /api/payments/gateway/status', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/gateway/config/razorpay', label: 'GET /api/payments/gateway/config/:provider', roles: allow('manager') },
    { method: 'get', pathTemplate: '/api/payments/my-bills', label: 'GET /api/payments/my-bills', roles: allow('admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator') },
    { method: 'get', pathTemplate: '/api/payments/my-history', label: 'GET /api/payments/my-history', roles: allow('admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator') },
    { method: 'get', pathTemplate: '/api/payments/my-gateway-status', label: 'GET /api/payments/my-gateway-status', roles: allow('admin', 'moderator', 'manager', 'fieldworker', 'collector', 'generator') },

    // ─── Generator household ───
    { method: 'get', pathTemplate: '/api/generator/household', label: 'GET /api/generator/household', roles: allow('generator') },
    { method: 'get', pathTemplate: '/api/waste-collections/household', label: 'GET /api/waste-collections/household (generator)', roles: allow('generator') },
];

// ─── Programmatic test generation ───
describe('Role Matrix — Access Control Sweep', () => {
    for (const ep of ENDPOINTS) {
        describe(ep.label, () => {
            for (const role of ROLES) {
                const expected = ep.roles[role];

                test(`${role} → ${expected}`, async () => {
                    const agent = agents[role];
                    const csrf = csrfTokens[role];
                    const path = resolvePath(ep.pathTemplate);

                    let req = (agent as any)[ep.method](path);
                    if (csrf && ['post', 'put', 'patch', 'delete'].includes(ep.method)) {
                        req = req.set('x-csrf-token', csrf);
                    }
                    if (ep.body) {
                        req = req.send(ep.body);
                    }

                    const res = await req;

                    if (expected === 'allow') {
                        expect([401, 403]).not.toContain(res.status);
                    } else {
                        expect([401, 403]).toContain(res.status);
                    }
                });
            }
        });
    }
});
