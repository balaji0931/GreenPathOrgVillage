import type { Response } from 'supertest';

/**
 * Log response details when a request fails (4xx/5xx).
 * Use this in tests to debug unexpected failures.
 *
 * @param res - Supertest response
 * @param label - Optional label for context (e.g., "Create village")
 */
export function debugResponse(res: Response, label?: string) {
    if (res.status >= 400) {
        console.error(
            `\n❌ [${label || 'DEBUG'}] HTTP ${res.status}`,
            JSON.stringify(res.body, null, 2)
        );
    }
}

/**
 * Log a test context message. Useful for tracing which step failed
 * in multi-step workflow tests.
 */
export function debugStep(step: string) {
    if (process.env.TEST_DEBUG === 'true') {
        console.log(`  → ${step}`);
    }
}
