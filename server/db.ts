import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Load environment variables
dotenv.config();

// Use DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Production-ready connection pool configuration
const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false,
  
  // Connection pool settings for production
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of connections
  min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum number of connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle connections after 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // Timeout for acquiring connection
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds for queries
  
  // Keep alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  
  // Application name for monitoring
  application_name: process.env.DB_APP_NAME || 'greenpath-api',
  
  // Statement timeout for long-running queries
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '60000'), // 60 seconds
};

export const pool = new Pool(poolConfig);

// Enhanced connection monitoring and error handling
pool.on('connect', (client) => {
  console.log('📊 New database client connected');
  
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

pool.on('acquire', () => {
  console.log('📊 Database connection acquired from pool');
});

pool.on('release', () => {
  console.log('📊 Database connection released back to pool');
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
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query, params) => {
      console.log('🔍 SQL Query:', query);
      if (params && params.length > 0) {
        console.log('📋 Parameters:', params);
      }
    }
  } : false
});

// Connection health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as health_check');
    const duration = Date.now() - start;
    
    console.log(`💚 Database health check passed in ${duration}ms`);
    return result.rows[0]?.health_check === 1;
  } catch (error) {
    console.error('💔 Database health check failed:', error);
    return false;
  }
};

// Database performance monitoring
export const getDatabaseStats = async () => {
  try {
    const stats = await pool.query(`
      SELECT 
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);
    
    return stats.rows[0];
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
};

// Initialize database health monitoring
if (process.env.NODE_ENV === 'production') {
  // Run health checks every 5 minutes
  setInterval(async () => {
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      console.error('🚨 Database health check failed! System may need attention.');
    }
  }, 5 * 60 * 1000);
  
  // Log database stats every hour
  setInterval(async () => {
    const stats = await getDatabaseStats();
    if (stats) {
      console.log('📊 Database performance stats:', {
        active_connections: stats.active_connections,
        cache_hit_ratio: stats.blocks_hit / (stats.blocks_read + stats.blocks_hit) * 100,
        transactions_per_second: (stats.transactions_committed + stats.transactions_rolled_back) / 3600
      });
    }
  }, 60 * 60 * 1000);
}