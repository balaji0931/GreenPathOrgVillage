import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
    // Load test environment variables FIRST
    dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

    // Force test mode
    process.env.NODE_ENV = 'test';

    // Verify critical env vars
    const required = ['DATABASE_URL', 'SESSION_SECRET', 'TEST_ADMIN_USER', 'TEST_ADMIN_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required test env vars in .env.test: ${missing.join(', ')}\n` +
            `Ensure .env.test exists at project root.`
        );
    }

    // Verify DB connection
    const { Pool } = await import('pg');
    const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
    const pool = new Pool({
        connectionString,
        ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        max: 2,
        connectionTimeoutMillis: 10000,
    });

    try {
        const client = await pool.connect();
        const result = await client.query('SELECT current_database(), current_user');
        const dbName = result.rows[0].current_database;
        console.log(`\n✅ Test DB connected: ${dbName}`);
        client.release();
    } catch (error: any) {
        throw new Error(`❌ Cannot connect to test database: ${error.message}`);
    } finally {
        await pool.end();
    }

    console.log(`✅ BCRYPT_ROUNDS=${process.env.BCRYPT_ROUNDS || '10'}`);
    console.log(`✅ NODE_ENV=${process.env.NODE_ENV}`);
}
