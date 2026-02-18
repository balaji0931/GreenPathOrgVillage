import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Load environment variables
dotenv.config();

// Use DATABASE_URL_POOLED for better connection pooling, fallback to DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DATABASE_URL_POOLED environment variable is required');
}

if (process.env.DATABASE_URL_POOLED) {
  console.log('✅ Using Neon pooled connection for better concurrency');
} else {
  console.log('⚠️ DATABASE_URL_POOLED not set, using standard DATABASE_URL');
}

// Enhanced connection pool configuration for 50K+ concurrent users
const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,

  // Connection pool settings optimized for scaling (Phase 1 optimization)
  max: parseInt(process.env.DB_POOL_MAX || '40'), // Increased from 10 for better concurrency
  min: parseInt(process.env.DB_POOL_MIN || '5'), // Increased from 2, maintain more connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'), // Increased from 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),

  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),

  // Keep alive for pooled connections
  keepAlive: process.env.DATABASE_URL_POOLED ? true : false,

  // Application name for monitoring
  application_name: process.env.DB_APP_NAME || 'greenpath-api',

  // Statement timeout for long-running queries (Phase 1: increased for scaling)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'), // Increased from 60s
};

export const pool = new Pool(poolConfig);

// Enhanced connection monitoring and error handling
pool.on('connect', (client) => {
  // Set session-level optimizations
  client.query(`
    SET timezone TO 'UTC';
    SET statement_timeout TO '${poolConfig.statement_timeout}ms';
    SET lock_timeout TO '10s';
    SET idle_in_transaction_session_timeout TO '30s';
  `).catch(err => {
    console.error('Failed to set session configuration:', err);
  });
});

pool.on('error', (err) => {
  console.error('💥 Unexpected database pool error:', err);
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('🔄 Closing database connection pool...');
  try {
    await pool.end();
    console.log('✅ Database connection pool closed successfully');
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Create Drizzle instance with enhanced configuration
export const db = drizzle(pool, {
  schema,
  logger: false // Disable query logging for production
});
