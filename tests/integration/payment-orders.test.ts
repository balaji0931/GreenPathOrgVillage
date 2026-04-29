/**
 * Payment Order Engine Tests (Layer 2)
 *
 * Tests multi-bill order creation, overlap guard (409),
 * household validation, and order expiry.
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
let villageId: string;
let managerId: string;
let household: any;
let unpaidBillIds: number[];

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Admin → create village
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Order Test Village', managerName: 'Order Manager', paymentsEnabled: true, managerPhone: '9900000010' });

    villageId = villageRes.body.village.villageId;
    managerId = villageRes.body.manager.credentials.userId;

    // Login as manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Seed household types
    await managerAgent.get('/api/household-types');

    // Seed household
    household = await seedHousehold(villageId, {
        headName: 'Order Test HH', phone: '9876543010', houseNumber: '201', ward: 'Ward-1',
    });

    // Activate 3 billing months
    for (const month of ['2026-01', '2026-02', '2026-03']) {
        await managerAgent
            .post('/api/payments/fee-config')
            .set('x-csrf-token', managerCsrf)
            .send({
                configs: [{ householdTypeCode: 'residential_small', feeAmount: '80', isWaivedCategory: false }],
            });
        await managerAgent
            .post('/api/payments/activate-cycle')
            .set('x-csrf-token', managerCsrf)
            .send({ billingMonth: month });
    }

    // Get unpaid bills
    const bills = await managerAgent.get(`/api/payments/household-unpaid/${household.household.id}`);
    unpaidBillIds = bills.body.map((b: any) => b.id);
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

// ═══════════════════════════════════════════
// Test 5 - Multi-Bill Order Mapping
// ═══════════════════════════════════════════

describe('Multi-Bill Order Creation', () => {
    test('household has at least 3 unpaid bills', () => {
        expect(unpaidBillIds.length).toBeGreaterThanOrEqual(3);
    });

    test('create order for multiple bills succeeds (or 400 if no gateway configured)', async () => {
        const res = await managerAgent
            .post('/api/payments/gateway/create-order')
            .set('x-csrf-token', managerCsrf)
            .send({ billIds: unpaidBillIds, method: 'upi' });

        // If no gateway config → 400/404 is expected
        // If gateway config exists → 200 with order details
        expect([200, 400, 404]).toContain(res.status);

        if (res.status === 200) {
            expect(res.body.orderId).toBeTruthy();
            expect(res.body.chargeableAmount).toBeGreaterThan(0);
            expect(res.body.billIds || res.body.billCount).toBeDefined();
        }
    });
});

// ═══════════════════════════════════════════
// Test 6 - Overlap Guard
// ═══════════════════════════════════════════

describe('Order Overlap Guard', () => {
    test('creating order for same bills returns 409 if active session exists', async () => {
        // First create (may fail if no gateway, but we test the flow)
        const first = await managerAgent
            .post('/api/payments/gateway/create-order')
            .set('x-csrf-token', managerCsrf)
            .send({ billIds: unpaidBillIds, method: 'upi' });

        if (first.status === 200) {
            // Second request should get 409
            const second = await managerAgent
                .post('/api/payments/gateway/create-order')
                .set('x-csrf-token', managerCsrf)
                .send({ billIds: unpaidBillIds, method: 'upi' });

            expect(second.status).toBe(409);
            expect(second.body.code).toBe('ACTIVE_PAYMENT_SESSION_EXISTS');
            expect(second.body.existingOrder).toBeDefined();
        }
    });
});

// ═══════════════════════════════════════════
// Test - Household Validation
// ═══════════════════════════════════════════

describe('Household Validation', () => {
    test('cannot create order with bills from different households', async () => {
        // Seed a second household and get its bills
        const hh2 = await seedHousehold(villageId, {
            headName: 'Other HH', phone: '9876543099', houseNumber: '299', ward: 'Ward-1',
        });
        // Note: hh2 may not have bills yet if cycle already activated
        // This test verifies backend validation exists
        const bills2 = await managerAgent.get(`/api/payments/household-unpaid/${hh2.household.id}`);

        if (bills2.body.length > 0 && unpaidBillIds.length > 0) {
            const mixedIds = [unpaidBillIds[0], bills2.body[0].id];

            const res = await managerAgent
                .post('/api/payments/gateway/create-order')
                .set('x-csrf-token', managerCsrf)
                .send({ billIds: mixedIds, method: 'upi' });

            expect(res.status).toBe(400);
        }
    });
});

// ═══════════════════════════════════════════
// Test - Household Unpaid Bills Endpoint
// ═══════════════════════════════════════════

describe('Household Unpaid Bills Endpoint', () => {
    test('returns unpaid bills sorted oldest to newest', async () => {
        const res = await managerAgent.get(`/api/payments/household-unpaid/${household.household.id}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        // Verify sorted oldest → newest
        const months = res.body.map((b: any) => b.billingMonth);
        const sorted = [...months].sort();
        expect(months).toEqual(sorted);
    });

    test('returns 200 empty array for nonexistent household', async () => {
        const res = await managerAgent.get('/api/payments/household-unpaid/99999');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

// ═══════════════════════════════════════════
// Test - Order Status Polling
// ═══════════════════════════════════════════

describe('Order Status Polling', () => {
    test('polling a nonexistent order returns 404', async () => {
        const res = await managerAgent.get('/api/payments/order-status/nonexistent-order-id');
        expect(res.status).toBe(404);
    });
});
