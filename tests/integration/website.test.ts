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

describe('Website Public Integration', () => {
    describe('POST /api/website-feedback', () => {
        test('submits feedback successfully', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    feedbackType: 'suggestion',
                    message: 'This is a great platform for waste management!',
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('submitted');
            expect(res.body.id).toBeDefined();
        });

        test('rejects missing fields', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({ name: 'Test', email: 'test@example.com' });

            expect(res.status).toBe(400);
        });

        test('rejects invalid email', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    feedbackType: 'general',
                    message: 'Some feedback message here that is long enough',
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('email');
        });

        test('rejects short message', async () => {
            const res = await request(app)
                .post('/api/website-feedback')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    feedbackType: 'general',
                    message: 'Short',
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/contact', () => {
        test('submits contact form successfully', async () => {
            const res = await request(app)
                .post('/api/contact')
                .send({
                    name: 'Contact User',
                    email: 'contact@example.com',
                    phone: '9876543210',
                    subject: 'Partnership Inquiry',
                    message: 'We are interested in implementing your solution in our area.',
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('sent');
        });

        test('rejects missing required fields', async () => {
            const res = await request(app)
                .post('/api/contact')
                .send({ name: 'Contact', email: 'c@e.com' });

            expect(res.status).toBe(400);
        });

        test('rejects short subject', async () => {
            const res = await request(app)
                .post('/api/contact')
                .send({
                    name: 'Contact User',
                    email: 'contact@example.com',
                    subject: 'Hi',
                    message: 'Message that is nice and long enough for validation',
                });

            expect(res.status).toBe(400);
        });
    });
});
