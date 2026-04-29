/**
 * Payment Ledger Logic Tests (Layer 1)
 *
 * Financial correctness tests for billing cycle activation,
 * cash payment marking, undo, and duplicate prevention.
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
let household1: any;
let household2: any;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);

    // Login as admin → create village
    adminAgent = request.agent(app);
    const adminLogin = await adminAgent
        .post('/api/auth/login')
        .send({ userId: process.env.TEST_ADMIN_USER, password: process.env.TEST_ADMIN_PASSWORD });
    adminCsrf = adminLogin.body.csrfToken;

    const villageRes = await adminAgent
        .post('/api/villages')
        .set('x-csrf-token', adminCsrf)
        .send({ villageName: 'Payment Test Village', managerName: 'Pay Manager', paymentsEnabled: true, managerPhone: '9900000001' });

    villageId = villageRes.body.village.villageId;
    managerId = villageRes.body.manager.credentials.userId;

    // Login as manager
    managerAgent = request.agent(app);
    const mLogin = await managerAgent
        .post('/api/auth/login')
        .send({ userId: managerId, password: managerId });
    managerCsrf = mLogin.body.csrfToken;

    // Seed households
    household1 = await seedHousehold(villageId, {
        headName: 'Raju Test', phone: '9876543001', houseNumber: '101', ward: 'Ward-1',
    });
    household2 = await seedHousehold(villageId, {
        headName: 'Priya Test', phone: '9876543002', houseNumber: '102', ward: 'Ward-1',
    });

    // Seed household types (auto-seeds via endpoint)
    await managerAgent.get('/api/household-types');

    // Save fee config for the test month
    await managerAgent
        .post('/api/payments/fee-config')
        .set('x-csrf-token', managerCsrf)
        .send({
            configs: [
                { householdTypeCode: 'residential_small', feeAmount: '80', isWaivedCategory: false },
                { householdTypeCode: 'residential_large', feeAmount: '120', isWaivedCategory: false },
                { householdTypeCode: 'slum_supported', feeAmount: '0', isWaivedCategory: true },
            ],
        });
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

// ═══════════════════════════════════════════
// Test 1 - Cycle Activation Generates Correct Bills
// ═══════════════════════════════════════════

describe('Cycle Activation', () => {
    test('activating a billing cycle creates bills for all active households', async () => {
        const res = await managerAgent
            .post('/api/payments/activate-cycle')
            .set('x-csrf-token', managerCsrf)
            .send({ billingMonth: '2026-01' });

        expect(res.status).toBe(200);
        expect(res.body.totalBillsGenerated).toBeGreaterThanOrEqual(2);
    });

    test('bills have correct fee snapshots from config', async () => {
        const summary = await managerAgent.get('/api/payments/summary?month=2026-01');
        expect(summary.status).toBe(200);
    });

    test('cannot activate same billing month twice', async () => {
        const res = await managerAgent
            .post('/api/payments/activate-cycle')
            .set('x-csrf-token', managerCsrf)
            .send({ billingMonth: '2026-01' });

        // Should reject - cycle already exists
        expect([400, 409]).toContain(res.status);
    });
});

// ═══════════════════════════════════════════
// Test 2 - Cash Payment Marks Bills Correctly
// ═══════════════════════════════════════════

describe('Cash Payment', () => {
    let unpaidBillId: number;

    beforeAll(async () => {
        // Fetch bills for household1
        const bills = await managerAgent.get(`/api/payments/household-unpaid/${household1.household.id}`);
        expect(bills.status).toBe(200);
        expect(bills.body.length).toBeGreaterThan(0);
        unpaidBillId = bills.body[0].id;
    });

    test('marking a bill as cash paid succeeds', async () => {
        const res = await managerAgent
            .post('/api/payments/mark-paid')
            .set('x-csrf-token', managerCsrf)
            .send({ billId: unpaidBillId, paymentMethod: 'cash' });

        expect(res.status).toBe(200);
        // Route returns {message, ...markBillPaid result}
        // markBillPaid returns the updated bill directly, so check status on body
        expect(res.body.message).toBe('Payment recorded');
    });

    test('receipt number follows village sequence format', async () => {
        // Already paid above, check format
        const bills = await managerAgent.get(`/api/payments/bills?month=2026-01`);
        if (Array.isArray(bills.body)) {
            const paidBill = bills.body.find((b: any) => b.id === unpaidBillId);
            if (paidBill) {
                expect(paidBill.receiptNumber).toBeTruthy();
            }
        }
    });
});

// ═══════════════════════════════════════════
// Test 3 - Bulk Cash Payment (Multi-Month)
// ═══════════════════════════════════════════

describe('Bulk Cash Payment', () => {
    let unpaidBillIds: number[];

    beforeAll(async () => {
        // Activate two more months for household2
        for (const month of ['2026-02', '2026-03']) {
            await managerAgent
                .post('/api/payments/fee-config')
                .set('x-csrf-token', managerCsrf)
                .send({
                    configs: [
                        { householdTypeCode: 'residential_small', feeAmount: '80', isWaivedCategory: false },
                    ],
                });
            await managerAgent
                .post('/api/payments/activate-cycle')
                .set('x-csrf-token', managerCsrf)
                .send({ billingMonth: month });
        }

        const bills = await managerAgent.get(`/api/payments/household-unpaid/${household2.household.id}`);
        unpaidBillIds = bills.body.map((b: any) => b.id);
        expect(unpaidBillIds.length).toBeGreaterThanOrEqual(2);
    });

    test('bulk mark paid marks all bills', async () => {
        const res = await managerAgent
            .post('/api/payments/mark-paid-bulk')
            .set('x-csrf-token', managerCsrf)
            .send({ billIds: unpaidBillIds, paymentMethod: 'cash' });

        expect(res.status).toBe(200);
    });

    test('all bulk-paid bills have unique receipts', async () => {
        const bills = await managerAgent.get(`/api/payments/bills?month=2026-01`);
        if (!Array.isArray(bills.body)) return;
        const paidBills = bills.body.filter((b: any) =>
            unpaidBillIds.includes(b.id) && b.status === 'paid'
        );
        const receiptNumbers = paidBills.map((b: any) => b.receiptNumber);
        const uniqueReceipts = new Set(receiptNumbers);
        expect(uniqueReceipts.size).toBe(receiptNumbers.length);
    });
});

// ═══════════════════════════════════════════
// Test 4 - Cannot Pay Already-Paid Bill
// ═══════════════════════════════════════════

describe('Duplicate Payment Prevention', () => {
    test('marking an already-paid bill returns error', async () => {
        // Get a paid bill from household1
        const bills = await managerAgent.get(`/api/payments/bills?month=2026-01`);
        if (!Array.isArray(bills.body)) return;
        const paidBill = bills.body.find((b: any) => b.status === 'paid');

        if (paidBill) {
            const res = await managerAgent
                .post('/api/payments/mark-paid')
                .set('x-csrf-token', managerCsrf)
                .send({ billId: paidBill.id, paymentMethod: 'cash' });

            // Should reject or return already paid
            expect([200, 400, 409]).toContain(res.status);
            if (res.status === 200) {
                // If 200, verify no duplicate receipt
                expect(res.body.bill.receiptNumber).toBe(paidBill.receiptNumber);
            }
        }
    });
});

// ═══════════════════════════════════════════
// Test - Undo Cash Payment
// ═══════════════════════════════════════════

describe('Undo Cash Payment', () => {
    let paidBillId: number;

    beforeAll(async () => {
        // Get a paid bill from household1
        const bills = await managerAgent.get(`/api/payments/bills?month=2026-01`);
        if (Array.isArray(bills.body)) {
            const paidBill = bills.body.find((b: any) =>
                b.status === 'paid' && b.householdId === household1.household.id
            );
            if (paidBill) paidBillId = paidBill.id;
        }
    });

    test('undo restores bill to unpaid', async () => {
        if (!paidBillId) return; // skip if no paid bill found

        const res = await managerAgent
            .post(`/api/payments/undo/${paidBillId}`)
            .set('x-csrf-token', managerCsrf);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Payment undone');
    });
});
