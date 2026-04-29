import '../setup/test-env';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { getCache } from '../../server/cache';

// Dedicated pool for test cleanup - separate from app pool
let cleanupPool: Pool | null = null;

function getCleanupPool(): Pool {
    if (!cleanupPool) {
        cleanupPool = new Pool({
            connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
            ssl: (process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL || '').includes('sslmode=require')
                ? { rejectUnauthorized: false } : false,
            max: 2,
        });
    }
    return cleanupPool;
}

/**
 * Table names in safe deletion order (respects FK constraints via CASCADE).
 * TRUNCATE ... CASCADE handles FK order, but listing explicitly for clarity.
 */
const ALL_TABLES = [
    // Payment tables
    'payment_gateway_orders',
    'household_monthly_bills',
    'billing_cycles',
    'village_month_fee_config',
    'village_payment_gateway_config',
    // Existing tables
    'dry_waste_sale_materials',
    'dry_waste_sales',
    'compost_production_log',
    'daily_waste_log',
    'daily_hourly_stats',
    'daily_vehicle_stats',
    'daily_ward_stats',
    'daily_village_stats',
    'waste_collections',
    'feedback',
    'issues',
    'qr_codes',
    'households',
    'collectors',
    'announcements',
    'moderator_village_assignments',
    'moderators',
    'website_feedback',
    'contact_submissions',
    'users',
    'villages',
];

/**
 * Truncate ALL tables in the test database.
 * Safe because we use a dedicated test DB.
 * Uses CASCADE to handle foreign key constraints.
 */
export async function truncateAll(): Promise<void> {
    const pool = getCleanupPool();
    await pool.query(`TRUNCATE TABLE ${ALL_TABLES.join(', ')} CASCADE`);

    // Clear cache to prevent cross-test pollution (critical when Redis is active)
    const cache = getCache();
    await cache.clear();
}

/**
 * Seed the test admin user.
 * Must be called after truncateAll() since it wipes users table.
 */
export async function seedAdmin(): Promise<void> {
    const pool = getCleanupPool();
    const adminUser = process.env.TEST_ADMIN_USER!;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD!;
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;

    const hashedPassword = await bcrypt.hash(adminPassword, rounds);

    await pool.query(
        `INSERT INTO users (user_id, password, role, name, phone)
     VALUES ($1, $2, 'admin', 'Test Admin', '0000000000')
     ON CONFLICT (user_id) DO NOTHING`,
        [adminUser, hashedPassword]
    );
}

/**
 * Standard setup for integration/security/workflow test files.
 * Truncates all tables and re-seeds the admin user.
 */
export async function resetTestDB(): Promise<void> {
    await truncateAll();
    await seedAdmin();
}

/**
 * Seed a household + generator user directly in the DB.
 * Replaces the removed POST /api/households route for test setup.
 * Returns the same shape tests expect: { household, generatorCredentials }.
 */
export async function seedHousehold(
    villageId: string,
    data: {
        headName: string;
        phone: string;
        houseNumber: string;
        familySize?: number;
        address?: string;
        ward?: string;
    }
): Promise<{
    household: { id: number; uid: string; villageId: string; headName: string };
    generatorCredentials: { userId: string; password: string };
}> {
    const pool = getCleanupPool();
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 1;

    // Find max household number for this village
    const maxRes = await pool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(uid FROM 'H(\\d+)$') AS INTEGER)), 0) AS max_num
         FROM households WHERE village_id = $1`,
        [villageId]
    );
    const nextNum = (maxRes.rows[0]?.max_num || 0) + 1;
    const uid = `${villageId}-H${String(nextNum).padStart(4, '0')}`;
    const generatorUserId = uid;
    const generatorPassword = uid;
    const hashedPassword = await bcrypt.hash(generatorPassword, rounds);

    // Insert household
    const hhRes = await pool.query(
        `INSERT INTO households (uid, village_id, head_name, phone, house_number, family_size, address, ward, status, generator_user_id, generator_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
         RETURNING id, uid, village_id AS "villageId", head_name AS "headName"`,
        [uid, villageId, data.headName, data.phone, data.houseNumber,
            data.familySize || 1, data.address || '', data.ward || 'Ward-1',
            generatorUserId, hashedPassword]
    );

    // Insert generator user
    await pool.query(
        `INSERT INTO users (user_id, password, role, name, phone, village_id)
         VALUES ($1, $2, 'generator', $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [generatorUserId, hashedPassword, `Generator - ${data.headName}`, data.phone, villageId]
    );

    // Invalidate household cache after raw SQL insert
    // Keys must match cacheKeys in server/cache.ts
    const cache = getCache();
    await cache.delete(`households:${villageId}`);           // cacheKeys.households()
    await cache.clear(`households:${villageId}:*`);          // cacheKeys.householdsPaginated() pattern
    await cache.delete(`stats:village:${villageId}`);        // cacheKeys.villageStats()

    return {
        household: hhRes.rows[0],
        generatorCredentials: { userId: generatorUserId, password: generatorPassword },
    };
}

/**
 * Close the cleanup pool. Call in global teardown.
 */
export async function closeCleanupPool(): Promise<void> {
    if (cleanupPool) {
        await cleanupPool.end();
        cleanupPool = null;
    }
}
