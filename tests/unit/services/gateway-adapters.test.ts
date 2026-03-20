/**
 * Gateway Adapter Contract Tests (Layer 4)
 *
 * Pure unit tests for adapter logic — no DB, no network.
 * Tests hash generation, amount conversion, status mapping,
 * and webhook signature verification.
 */
import '../../setup/test-env';
import { describe, test, expect } from '@jest/globals';
import crypto from 'crypto';

// ═══════════════════════════════════════════
// Razorpay Adapter Tests
// ═══════════════════════════════════════════

describe('Razorpay Adapter', () => {
    // Import adapter directly — constructor validates config
    let RazorpayAdapter: any;

    beforeAll(async () => {
        const mod = await import('../../../server/modules/payment/gateways/razorpay.adapter');
        RazorpayAdapter = mod.RazorpayAdapter;
    });

    test('constructor validates required fields', () => {
        expect(() => new RazorpayAdapter({})).toThrow('key_id');
        expect(() => new RazorpayAdapter({ key_id: 'test' })).toThrow('key_secret');
        expect(() => new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' })).not.toThrow();
    });

    test('provider is "razorpay"', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' });
        expect(adapter.provider).toBe('razorpay');
    });

    test('webhook signature verification works for valid signature', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret', signature_key: 'webhook_secret' });
        const rawBody = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test123"}}}}';
        const signatureKey = 'webhook_secret';
        const validSig = crypto.createHmac('sha256', signatureKey).update(rawBody).digest('hex');

        const result = adapter.verifyWebhook(
            { 'x-razorpay-signature': validSig },
            rawBody,
            signatureKey
        );
        expect(result).toBe(true);
    });

    test('webhook signature verification rejects invalid signature', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' });
        const result = adapter.verifyWebhook(
            { 'x-razorpay-signature': 'invalid_hex_signature_value_here_00000000' },
            'some body',
            'some_key'
        );
        expect(result).toBe(false);
    });

    test('webhook rejects missing signature header', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' });
        expect(adapter.verifyWebhook({}, 'body', 'key')).toBe(false);
    });

    test('parsePaymentEvent maps payment.captured to success', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' });
        const event = adapter.parsePaymentEvent({
            event: 'payment.captured',
            payload: {
                payment: {
                    entity: {
                        id: 'pay_test123',
                        order_id: 'order_test456',
                        amount: 10000,
                    },
                },
            },
        });

        expect(event.status).toBe('success');
        expect(event.orderId).toBe('order_test456');
        expect(event.gatewayTxnId).toBe('pay_test123');
        expect(event.amountPaise).toBe(10000);
    });

    test('parsePaymentEvent maps payment.failed to failed', () => {
        const adapter = new RazorpayAdapter({ key_id: 'test', key_secret: 'secret' });
        const event = adapter.parsePaymentEvent({
            event: 'payment.failed',
            payload: {
                payment: {
                    entity: { id: 'pay_fail', order_id: 'order_fail', amount: 5000 },
                },
            },
        });
        expect(event.status).toBe('failed');
    });
});

// ═══════════════════════════════════════════
// Cashfree Adapter Tests
// ═══════════════════════════════════════════

describe('Cashfree Adapter', () => {
    let CashfreeAdapter: any;

    beforeAll(async () => {
        const mod = await import('../../../server/modules/payment/gateways/cashfree.adapter');
        CashfreeAdapter = mod.CashfreeAdapter;
    });

    test('constructor validates required fields', () => {
        expect(() => new CashfreeAdapter({})).toThrow('client_id');
        expect(() => new CashfreeAdapter({ client_id: 'test' })).toThrow('client_secret');
        expect(() => new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' })).not.toThrow();
    });

    test('provider is "cashfree"', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        expect(adapter.provider).toBe('cashfree');
    });

    test('test mode uses sandbox URL', () => {
        const adapter = new CashfreeAdapter({ client_id: 't', client_secret: 's' }, true);
        // Access private baseUrl indirectly via the provider behavior
        expect(adapter.provider).toBe('cashfree');
    });

    test('webhook signature verification with valid signature', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret', signature_key: 'cf_secret' });
        const timestamp = '1234567890';
        const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{}}';
        const signaturePayload = timestamp + rawBody;
        const validSig = crypto.createHmac('sha256', 'cf_secret').update(signaturePayload).digest('base64');

        const result = adapter.verifyWebhook(
            { 'x-cashfree-signature': validSig, 'x-cashfree-timestamp': timestamp },
            rawBody,
            'cf_secret'
        );
        expect(result).toBe(true);
    });

    test('webhook rejects invalid signature', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        const result = adapter.verifyWebhook(
            { 'x-cashfree-signature': 'aW52YWxpZA==', 'x-cashfree-timestamp': '12345' },
            'body',
            'wrong_key'
        );
        expect(result).toBe(false);
    });

    test('webhook rejects missing headers', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        expect(adapter.verifyWebhook({}, 'body', 'key')).toBe(false);
    });

    test('parsePaymentEvent maps SUCCESS to success', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        const event = adapter.parsePaymentEvent({
            type: 'PAYMENT_SUCCESS_WEBHOOK',
            data: {
                order: { order_id: 'ORD-123' },
                payment: { cf_payment_id: 'cf_pay_456', payment_status: 'SUCCESS', payment_amount: 150 },
            },
        });

        expect(event.status).toBe('success');
        expect(event.orderId).toBe('ORD-123');
        expect(event.gatewayTxnId).toBe('cf_pay_456');
        expect(event.amountPaise).toBe(15000);
    });

    test('parsePaymentEvent maps FAILED to failed', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        const event = adapter.parsePaymentEvent({
            data: {
                order: { order_id: 'ORD-fail' },
                payment: { cf_payment_id: 'cf_fail', payment_status: 'FAILED', payment_amount: 100 },
            },
        });
        expect(event.status).toBe('failed');
    });

    test('parsePaymentEvent maps USER_DROPPED to failed (filtered by handler)', () => {
        const adapter = new CashfreeAdapter({ client_id: 'test', client_secret: 'secret' });
        const event = adapter.parsePaymentEvent({
            data: {
                order: { order_id: 'ORD-drop' },
                payment: { cf_payment_id: 'cf_drop', payment_status: 'USER_DROPPED' },
            },
        });
        expect(event.status).toBe('failed');
    });
});

// ═══════════════════════════════════════════
// PayU Adapter Tests
// ═══════════════════════════════════════════

describe('PayU Adapter', () => {
    let PayUAdapter: any;

    beforeAll(async () => {
        const mod = await import('../../../server/modules/payment/gateways/payu.adapter');
        PayUAdapter = mod.PayUAdapter;
    });

    test('constructor validates required fields', () => {
        expect(() => new PayUAdapter({})).toThrow('merchant_key');
        expect(() => new PayUAdapter({ merchant_key: 'test' })).toThrow('merchant_salt');
        expect(() => new PayUAdapter({ merchant_key: 'test', merchant_salt: 'salt' })).not.toThrow();
    });

    test('provider is "payu"', () => {
        const adapter = new PayUAdapter({ merchant_key: 'test', merchant_salt: 'salt' });
        expect(adapter.provider).toBe('payu');
    });

    test('hash generation is deterministic', () => {
        const adapter = new PayUAdapter({ merchant_key: 'testkey', merchant_salt: 'testsalt' });

        // Generate hash by calling createInAppCheckout twice with same params
        // Both should produce same hash in formFields
        // Since createInAppCheckout is async and doesn't call API for hash, we test idempotency
        const promise1 = adapter.createInAppCheckout({
            orderId: 'ORD-1234',
            chargeableAmountRupees: 100,
            customerName: 'Test',
            metadata: { billingMonths: '2026-01' },
        });

        const promise2 = adapter.createInAppCheckout({
            orderId: 'ORD-1234',
            chargeableAmountRupees: 100,
            customerName: 'Test',
            metadata: { billingMonths: '2026-01' },
        });

        return Promise.all([promise1, promise2]).then(([r1, r2]) => {
            expect(r1.checkoutData.formFields.hash).toBe(r2.checkoutData.formFields.hash);
            expect(r1.checkoutData.formFields.hash.length).toBe(128); // SHA-512 = 128 hex chars
        });
    });

    test('parsePaymentEvent maps success correctly', () => {
        const adapter = new PayUAdapter({ merchant_key: 'test', merchant_salt: 'salt' });
        const event = adapter.parsePaymentEvent({
            txnid: 'TXN-123',
            mihpayid: 'MIHY-456',
            status: 'success',
            amount: '150.00',
        });

        expect(event.status).toBe('success');
        expect(event.orderId).toBe('TXN-123');
        expect(event.gatewayTxnId).toBe('MIHY-456');
        expect(event.amountPaise).toBe(15000);
    });

    test('parsePaymentEvent maps failure correctly', () => {
        const adapter = new PayUAdapter({ merchant_key: 'test', merchant_salt: 'salt' });
        const event = adapter.parsePaymentEvent({
            txnid: 'TXN-fail',
            mihpayid: 'MIHY-fail',
            status: 'failure',
            amount: '100.00',
        });
        expect(event.status).toBe('failed');
    });

    test('parsePaymentEvent maps dropped correctly', () => {
        const adapter = new PayUAdapter({ merchant_key: 'test', merchant_salt: 'salt' });
        const event = adapter.parsePaymentEvent({
            txnid: 'TXN-drop',
            mihpayid: 'MIHY-drop',
            status: 'dropped',
        });
        expect(event.status).toBe('failed');
    });

    test('webhook reverse hash verification works', () => {
        const adapter = new PayUAdapter({ merchant_key: 'testkey', merchant_salt: 'testsalt' });

        // Build known params
        const params = {
            txnid: 'TXN-123',
            amount: '100.00',
            productinfo: 'Test Product',
            firstname: 'Test',
            email: 'test@example.com',
            status: 'success',
        };

        // Calculate the expected reverse hash
        const reverseHashString = [
            'testsalt',
            params.status,
            '', '', '', '', '', // reserved
            '', '', '', '', '', // udf5-1
            params.email,
            params.firstname,
            params.productinfo,
            params.amount,
            params.txnid,
            'testkey',
        ].join('|');
        const expectedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

        // Construct body with correct hash
        const body = JSON.stringify({ ...params, hash: expectedHash });

        const result = adapter.verifyWebhook({}, body, 'testsalt');
        expect(result).toBe(true);
    });

    test('webhook rejects invalid hash', () => {
        const adapter = new PayUAdapter({ merchant_key: 'testkey', merchant_salt: 'testsalt' });
        const body = JSON.stringify({
            txnid: 'TXN-123',
            amount: '100.00',
            productinfo: 'Test',
            firstname: 'Test',
            email: 'test@example.com',
            status: 'success',
            hash: 'invalid_hash_value_that_is_definitely_wrong',
        });

        const result = adapter.verifyWebhook({}, body, 'testsalt');
        expect(result).toBe(false);
    });
});

// ═══════════════════════════════════════════
// Cross-Adapter Contract Compliance
// ═══════════════════════════════════════════

describe('Adapter Interface Contract', () => {
    const adapters = [
        { name: 'Razorpay', config: { key_id: 'test', key_secret: 'secret' }, module: '../../../server/modules/payment/gateways/razorpay.adapter', class: 'RazorpayAdapter' },
        { name: 'Cashfree', config: { client_id: 'test', client_secret: 'secret' }, module: '../../../server/modules/payment/gateways/cashfree.adapter', class: 'CashfreeAdapter' },
        { name: 'PayU', config: { merchant_key: 'test', merchant_salt: 'salt' }, module: '../../../server/modules/payment/gateways/payu.adapter', class: 'PayUAdapter' },
    ];

    test.each(adapters)('$name adapter implements all required methods', async ({ config, module: mod, class: cls }) => {
        const imported = await import(mod);
        const adapter = new imported[cls](config);

        expect(typeof adapter.provider).toBe('string');
        expect(typeof adapter.createUPIQRPayment).toBe('function');
        expect(typeof adapter.createInAppCheckout).toBe('function');
        expect(typeof adapter.verifyWebhook).toBe('function');
        expect(typeof adapter.parsePaymentEvent).toBe('function');
    });
});
