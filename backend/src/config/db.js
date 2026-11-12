const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Determine if connecting to a remote/hosted database (e.g. Neon)
const isRemote = Boolean(
  (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) ||
  (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
);

// Determine SSL requirement:
// Explicit override via DB_SSL takes precedence, otherwise enable SSL for remote hosts (e.g. Neon)
const enableSsl = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && isRemote);

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: enableSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'paymind_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: enableSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

/**
 * Execute a query with optional params.
 * @param {string} text - SQL query
 * @param {Array} params - Parameterised values
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DB] ${duration}ms — ${text.substring(0, 80)}`);
  }
  return res;
}

/**
 * Get a client for transaction use.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { pool, query, getClient };
