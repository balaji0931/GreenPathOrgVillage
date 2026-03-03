import type TestAgent from 'supertest/lib/agent';
import type { Test } from 'supertest';

/**
 * Login as a user and return session cookie + CSRF token.
 * Uses the real /api/auth/login endpoint.
 */
export async function loginAs(
    agent: TestAgent<Test>,
    userId: string,
    password: string
): Promise<{ cookie: string[]; csrfToken: string }> {
    const res = await agent
        .post('/api/auth/login')
        .send({ userId, password });

    if (res.status !== 200) {
        throw new Error(
            `Login failed for ${userId}: ${res.status} ${JSON.stringify(res.body)}`
        );
    }

    const cookie = (res.headers['set-cookie'] ?? []) as unknown as string[];
    const csrfToken = res.body.csrfToken || '';

    if (!cookie || cookie.length === 0) {
        throw new Error(`No session cookie returned for ${userId}`);
    }

    return { cookie, csrfToken };
}

/**
 * Login as the pre-seeded test admin.
 * Reads credentials from TEST_ADMIN_USER and TEST_ADMIN_PASSWORD env vars.
 */
export async function loginAsAdmin(
    agent: TestAgent<Test>
): Promise<{ cookie: string[]; csrfToken: string }> {
    const adminUser = process.env.TEST_ADMIN_USER;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
        throw new Error(
            'TEST_ADMIN_USER and TEST_ADMIN_PASSWORD must be set in .env.test'
        );
    }

    return loginAs(agent, adminUser, adminPassword);
}
