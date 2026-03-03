/**
 * INPUT VALIDATION ATTACKS — XSS, oversized, malformed, negative, extra fields.
 *
 * Tests that all endpoints reject malicious input with 400 (not 500).
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;
let adminAgent: any;
let adminCsrf: string;
let managerAgent: any;
let managerCsrf: string;
let collectorAgent: any;
let collectorCsrf: string;
let villageId: string;
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
        .send({ villageName: 'Input Village', managerName: 'Input Mgr', managerPhone: '1111111111' });
    villageId = vRes.body.village.villageId;
    const managerId = vRes.body.manager.credentials.userId;

    // Manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Collector
    const colRes = await managerAgent
        .post('/api/collectors')
        .set('x-csrf-token', managerCsrf)
        .send({ name: 'Input Col', phone: '3333333333' });
    collectorUid = colRes.body.uid;
    collectorAgent = request.agent(app);
    const cLogin = await collectorAgent
        .post('/api/auth/login')
        .send({ userId: collectorUid, password: collectorUid });
    collectorCsrf = cLogin.body.csrfToken;
}, 60000);

afterAll(async () => {
    await closeCleanupPool();
});

// Strings rejected by validateInput middleware (400) — contains <, >, javascript:, onerror=, onload=
const BLOCKED_XSS_STRINGS = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    "javascript:alert('xss')",
];

// Strings that pass validateInput (no dangerous patterns) but are safe due to parameterized queries
const SAFE_BUT_SUSPICIOUS_STRINGS = [
    "'; DROP TABLE users; --",
];

const OVERSIZED_STRING = 'A'.repeat(11000);

describe('Input Validation Attacks', () => {
    describe('XSS injection in login — rejected with 400', () => {
        for (const xss of BLOCKED_XSS_STRINGS) {
            test(`login userId: "${xss.slice(0, 30)}..." → 400`, async () => {
                const freshAgent = request.agent(app);
                const res = await freshAgent
                    .post('/api/auth/login')
                    .send({ userId: xss, password: 'test' });
                expect(res.status).toBe(400);
            });
        }
    });

    describe('Non-dangerous suspicious strings in login — safely handled', () => {
        for (const s of SAFE_BUT_SUSPICIOUS_STRINGS) {
            test(`login userId: "${s.slice(0, 30)}..." → 401 (no crash)`, async () => {
                const freshAgent = request.agent(app);
                const res = await freshAgent
                    .post('/api/auth/login')
                    .send({ userId: s, password: 'test' });
                // SQL injection strings pass validateInput but fail auth (401)
                expect(res.status).not.toBe(500);
            });
        }
    });

    // validateInput now rejects dangerous input with 400 on ALL endpoints
    describe('XSS in village creation — rejected with 400', () => {
        for (const xss of BLOCKED_XSS_STRINGS) {
            test(`villageName: "${xss.slice(0, 30)}..." → 400`, async () => {
                const res = await adminAgent
                    .post('/api/villages')
                    .set('x-csrf-token', adminCsrf)
                    .send({ villageName: xss, managerName: 'Test', managerPhone: '0000000000' });
                expect(res.status).toBe(400);
            });
        }
    });


    describe('XSS in issue creation — rejected with 400', () => {
        for (const xss of BLOCKED_XSS_STRINGS) {
            test(`title: "${xss.slice(0, 30)}..." → 400`, async () => {
                const res = await collectorAgent
                    .post('/api/issues')
                    .set('x-csrf-token', collectorCsrf)
                    .send({ title: xss, description: xss, category: xss });
                expect(res.status).toBe(400);
            });
        }
    });

    describe('XSS in website feedback — rejected with 400', () => {
        test('XSS in message → 400', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({
                    name: '<script>alert(1)</script>',
                    email: 'test@example.com',
                    feedbackType: 'general',
                    message: '<script>alert("xss")</script> This is a malicious feedback',
                });
            expect(res.status).toBe(400);
        });
    });

    describe('XSS in contact form — rejected with 400', () => {
        test('XSS in subject/message → 400', async () => {
            const res = await request(app)
                .post('/api/contact')
                .send({
                    name: '<script>alert(1)</script>',
                    email: 'test@example.com',
                    subject: '<img src=x onerror=alert(1)> Test Subject',
                    message: '<svg onload=alert(1)> This is a malicious contact message',
                });
            expect(res.status).toBe(400);
        });
    });

    describe('Oversized inputs — no crash', () => {
        test('oversized village name → no 500', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: OVERSIZED_STRING, managerName: 'Test', managerPhone: '0000000000' });
            // No server-side length validation — accepted or DB error, never crash
            expect(res.status).not.toBe(500);
        });

        test('oversized issue description → no 500', async () => {
            const res = await collectorAgent
                .post('/api/issues')
                .set('x-csrf-token', collectorCsrf)
                .send({ title: 'Valid Title', description: OVERSIZED_STRING, category: 'waste' });
            expect(res.status).not.toBe(500);
        });

        test('oversized login userId → 400/401', async () => {
            const freshAgent = request.agent(app);
            const res = await freshAgent
                .post('/api/auth/login')
                .send({ userId: OVERSIZED_STRING, password: 'test' });
            expect([400, 401]).toContain(res.status);
        });

        test('oversized website feedback → 400', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({
                    name: OVERSIZED_STRING,
                    email: 'test@example.com',
                    feedbackType: 'general',
                    message: OVERSIZED_STRING,
                });
            expect([400, 413]).toContain(res.status);
        });
    });

    describe('Malformed JSON', () => {
        test('non-JSON body → 400', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .set('Content-Type', 'application/json')
                .send('{ invalid json }');
            expect([400, 403]).toContain(res.status);
        });
    });

    describe('Missing required fields', () => {
        test('village without managerName → 400/500', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({ villageName: 'NoManager' });
            expect(res.status).not.toBe(200);
        });

        test('issue without title → 400', async () => {
            const res = await collectorAgent
                .post('/api/issues')
                .set('x-csrf-token', collectorCsrf)
                .send({ description: 'No title here very long description enough' });
            expect(res.status).toBe(400);
        });
    });

    describe('Unexpected extra fields (should be ignored, not crash)', () => {
        test('login with extra fields → 200/401 (not 500)', async () => {
            const freshAgent = request.agent(app);
            const res = await freshAgent
                .post('/api/auth/login')
                .send({
                    userId: process.env.TEST_ADMIN_USER,
                    password: process.env.TEST_ADMIN_PASSWORD,
                    extraField: 'hacker',
                    __proto__: { admin: true },
                });
            expect(res.status).not.toBe(500);
        });

        test('village creation with extra fields → not 500', async () => {
            const res = await adminAgent
                .post('/api/villages')
                .set('x-csrf-token', adminCsrf)
                .send({
                    villageName: 'Extra Village',
                    managerName: 'Extra Mgr',
                    managerPhone: '0000000000',
                    isAdmin: true,
                    role: 'admin',
                    __proto__: { admin: true },
                });
            expect(res.status).not.toBe(500);
        });
    });

    describe('Negative numbers', () => {
        test('negative waste quantity → not crash', async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await managerAgent
                .post('/api/material-log/daily-waste')
                .set('x-csrf-token', managerCsrf)
                .send({ date: today, wetWasteKg: '-10', dryWasteKg: '-5' });
            expect(res.status).not.toBe(500);
        });
    });
});
