import type TestAgent from 'supertest/lib/agent';
import type { Test } from 'supertest';

/**
 * Fetch a fresh CSRF token for an authenticated session.
 * Must be called after login with a valid session cookie.
 */
export async function getCsrfToken(
    agent: TestAgent<Test>,
    cookie: string[]
): Promise<string> {
    const res = await agent
        .get('/api/auth/csrf-token')
        .set('Cookie', cookie);

    if (res.status !== 200) {
        throw new Error(
            `Failed to get CSRF token: ${res.status} ${JSON.stringify(res.body)}`
        );
    }

    return res.body.csrfToken;
}
