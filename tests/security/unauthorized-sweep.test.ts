/**
 * UNAUTHORIZED SWEEP - Every protected endpoint returns 401 without session.
 *
 * Iterates all protected endpoints and confirms: no session → 401.
 */
import '../setup/test-env';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app';
import { registerRoutes } from '../../server/routes';
import { truncateAll, seedAdmin, closeCleanupPool } from '../helpers/cleanup';

let app: any;

beforeAll(async () => {
    await truncateAll();
    await seedAdmin();
    const created = createApp();
    app = created.app;
    await registerRoutes(app);
}, 30000);

afterAll(async () => {
    await closeCleanupPool();
});

// All protected endpoints
const PROTECTED_ENDPOINTS: Array<{ method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string; body?: any }> = [
    // Auth
    // Auth (logout is idempotent - returns 200 even without session)
    { method: 'get', path: '/api/auth/user' },
    { method: 'post', path: '/api/auth/change-password', body: { newPassword: 'x' } },

    // Village
    { method: 'get', path: '/api/villages' },
    { method: 'get', path: '/api/villages/V001' },
    { method: 'post', path: '/api/villages', body: { villageName: 'x', managerName: 'x', managerPhone: 'x' } },
    { method: 'put', path: '/api/villages/V001', body: { name: 'x' } },
    { method: 'delete', path: '/api/villages/V001' },
    { method: 'get', path: '/api/villages/V001/wards' },
    { method: 'post', path: '/api/villages/V001/wards', body: { ward: 'x' } },

    // Household
    { method: 'get', path: '/api/households' },
    { method: 'get', path: '/api/households/paginated' },
    { method: 'get', path: '/api/households/FAKE-UID' },
    { method: 'delete', path: '/api/households/999' },

    // Collector
    { method: 'get', path: '/api/collectors' },
    { method: 'get', path: '/api/collectors/stats/V001' },
    { method: 'post', path: '/api/collectors', body: { name: 'x', phone: 'x' } },

    // Waste Collection
    { method: 'post', path: '/api/waste-collections', body: {} },
    { method: 'get', path: '/api/waste-collections/household/FAKE' },
    { method: 'get', path: '/api/waste-collections/collector' },
    { method: 'get', path: '/api/waste-collections/village' },
    { method: 'get', path: '/api/collections/daily-summary' },

    // Issue
    { method: 'post', path: '/api/issues', body: {} },
    { method: 'get', path: '/api/issues' },
    { method: 'get', path: '/api/issues/paginated' },
    { method: 'patch', path: '/api/issues/1', body: {} },

    // Announcement
    { method: 'post', path: '/api/announcements', body: {} },
    { method: 'get', path: '/api/announcements' },
    { method: 'get', path: '/api/admin/announcements' },
    { method: 'delete', path: '/api/announcements/1' },

    // Feedback
    { method: 'post', path: '/api/feedback', body: {} },
    { method: 'get', path: '/api/feedback/village' },

    // Admin Users
    { method: 'post', path: '/api/moderators', body: {} },
    { method: 'get', path: '/api/moderators' },
    { method: 'get', path: '/api/managers' },
    { method: 'put', path: '/api/managers/x/reset-password' },
    { method: 'put', path: '/api/moderators/x/reset-password' },
    { method: 'post', path: '/api/villages/V001/managers', body: {} },

    // Profile
    { method: 'put', path: '/api/profile', body: {} },

    // Stats
    { method: 'get', path: '/api/manager/stats' },


    { method: 'get', path: '/api/stats/village' },

    { method: 'get', path: '/api/analytics/premium' },

    // Admin
    { method: 'get', path: '/api/admin/website-feedback' },
    { method: 'get', path: '/api/admin/contact-submissions' },

    // Moderator
    { method: 'get', path: '/api/moderator/villages' },
    { method: 'get', path: '/api/moderator/issues' },
    { method: 'get', path: '/api/moderator/collectors' },
    { method: 'get', path: '/api/moderator/households' },
    { method: 'get', path: '/api/moderator/managers' },

    { method: 'post', path: '/api/moderator/announcements', body: {} },
    { method: 'put', path: '/api/moderator/managers/x/reset-password' },
    { method: 'delete', path: '/api/moderator/managers/x' },
    { method: 'patch', path: '/api/moderator/issues/1', body: {} },

    // Vehicle
    { method: 'post', path: '/api/villages/V001/vehicles', body: {} },
    { method: 'patch', path: '/api/villages/V001/vehicles/FAKE' },
    { method: 'delete', path: '/api/villages/V001/vehicles/FAKE' },

    // Material Log
    { method: 'get', path: '/api/material-log/daily-waste' },
    { method: 'post', path: '/api/material-log/daily-waste', body: {} },
    { method: 'patch', path: '/api/material-log/daily-waste/1' },
    { method: 'delete', path: '/api/material-log/daily-waste/1' },
    { method: 'get', path: '/api/material-log/compost' },
    { method: 'post', path: '/api/material-log/compost', body: {} },
    { method: 'delete', path: '/api/material-log/compost/1' },
    { method: 'get', path: '/api/material-log/dry-waste-sales' },
    { method: 'post', path: '/api/material-log/dry-waste-sales', body: {} },
    { method: 'delete', path: '/api/material-log/dry-waste-sales/1' },

    // Fieldworker
    { method: 'get', path: '/api/fieldworkers' },
    { method: 'post', path: '/api/fieldworkers', body: {} },
    { method: 'delete', path: '/api/fieldworkers/FAKE' },

    // QR Codes
    { method: 'get', path: '/api/qr-codes' },
    { method: 'post', path: '/api/qr-codes/batch', body: { quantity: 1 } },
    { method: 'post', path: '/api/qr-codes/FAKE/map', body: {} },

    // Upload
    { method: 'post', path: '/api/upload/photo' },
    { method: 'post', path: '/api/upload/voice' },
    { method: 'post', path: '/api/upload/manager-proof' },
    { method: 'post', path: '/api/upload' },

    // Payment / Billing
    { method: 'get', path: '/api/household-types' },
    { method: 'post', path: '/api/household-types', body: { name: 'x', fee: 100 } },
    { method: 'get', path: '/api/payments/fee-config' },
    { method: 'post', path: '/api/payments/fee-config', body: {} },
    { method: 'get', path: '/api/payments/activation-preview' },
    { method: 'post', path: '/api/payments/activate-cycle', body: {} },
    { method: 'get', path: '/api/payments/cycles' },
    { method: 'get', path: '/api/payments/bills' },
    { method: 'get', path: '/api/payments/bills/household/1' },
    { method: 'post', path: '/api/payments/add-bill', body: {} },
    { method: 'post', path: '/api/payments/mark-paid', body: {} },
    { method: 'post', path: '/api/payments/mark-paid-bulk', body: {} },
    { method: 'post', path: '/api/payments/undo/1', body: {} },
    { method: 'post', path: '/api/payments/waive/1', body: {} },
    { method: 'get', path: '/api/payments/summary' },
    { method: 'get', path: '/api/payments/household-unpaid/1' },
    { method: 'get', path: '/api/payments/gateway/status' },
    { method: 'get', path: '/api/payments/gateway/config/razorpay' },
    { method: 'delete', path: '/api/payments/gateway/config/razorpay' },
    { method: 'post', path: '/api/payments/gateway/config', body: {} },
    { method: 'post', path: '/api/payments/gateway/test', body: {} },
    { method: 'get', path: '/api/payments/gateway/available' },
    { method: 'post', path: '/api/payments/gateway/create-order', body: {} },
    { method: 'get', path: '/api/payments/order-status/FAKE' },
    { method: 'get', path: '/api/payments/my-bills' },
    { method: 'get', path: '/api/payments/my-history' },
    { method: 'get', path: '/api/payments/my-gateway-status' },
    { method: 'post', path: '/api/payments/gateway/verify-payment', body: {} },

    // Generator household
    { method: 'get', path: '/api/generator/household' },
];

describe('Unauthorized Sweep - No Session → 401', () => {
    for (const ep of PROTECTED_ENDPOINTS) {
        test(`${ep.method.toUpperCase()} ${ep.path} → 401`, async () => {
            const freshAgent = request.agent(app);
            let req = (freshAgent as any)[ep.method](ep.path);
            if (ep.body) {
                req = req.send(ep.body);
            }
            const res = await req;
            expect(res.status).toBe(401);
        });
    }
});
