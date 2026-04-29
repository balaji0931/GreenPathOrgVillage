/**
 * Test environment loader.
 * Import this at the top of any test helper or test file that needs env vars.
 * Idempotent - safe to call multiple times.
 */
import dotenv from 'dotenv';
import path from 'path';

// Only load once
if (!process.env._TEST_ENV_LOADED) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
    process.env.NODE_ENV = 'test';
    process.env._TEST_ENV_LOADED = 'true';
}
