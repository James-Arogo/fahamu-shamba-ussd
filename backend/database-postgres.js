/**
 * PostgreSQL Database Helper for Vercel Deployment
 * Replaces SQLite with persistent PostgreSQL (Neon/Vercel Postgres)
 */

import pg from 'pg';
const { Pool } = pg;

const normalizePostgresUrl = (value) => {
  const raw = (value || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') {
      return raw;
    }
    return '';
  } catch {
    // Attempt to repair common malformed URLs where password has unescaped special chars.
    if (!/^postgres(ql)?:\/\//i.test(raw)) {
      return '';
    }

    const schemeEnd = raw.indexOf('://') + 3;
    const atIndex = raw.lastIndexOf('@');
    if (atIndex === -1 || atIndex <= schemeEnd) return '';

    const slashAfterHost = raw.indexOf('/', atIndex);
    if (slashAfterHost === -1) return '';

    const credentials = raw.slice(schemeEnd, atIndex);
    const hostPort = raw.slice(atIndex + 1, slashAfterHost);
    const pathAndQuery = raw.slice(slashAfterHost);
    const firstColon = credentials.indexOf(':');
    if (firstColon === -1) return '';

    const username = credentials.slice(0, firstColon);
    const password = credentials.slice(firstColon + 1);
    if (!username || !password || !hostPort) return '';

    const repaired = `${raw.slice(0, schemeEnd)}${username}:${encodeURIComponent(password)}@${hostPort}${pathAndQuery}`;
    try {
      const parsedRepaired = new URL(repaired);
      if (parsedRepaired.protocol === 'postgres:' || parsedRepaired.protocol === 'postgresql:') {
        return repaired;
      }
      return '';
    } catch {
      return '';
    }
  }
};

const rawDatabaseUrl = (process.env.DATABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
let connectionString = '';
let pool;

connectionString = normalizePostgresUrl(rawDatabaseUrl);

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection on startup
  pool.on('connect', () => {
    console.log('✅ PostgreSQL connected successfully');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL error:', err);
  });
} else {
  console.warn('⚠️ PostgreSQL disabled: DATABASE_URL is missing or invalid.');
  pool = {
    query: async () => {
      throw new Error('PostgreSQL connection is not configured');
    },
    on: () => {},
    end: async () => {}
  };
}

/**
 * Execute a query and return all rows
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Array of rows
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Executed query in ${duration}ms:`, text.substring(0, 100));
    return result.rows;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

/**
 * Execute a query and return a single row
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null
 */
export const getOne = async (text, params = []) => {
  const rows = await query(text, params);
  return rows[0] || null;
};

/**
 * Execute an INSERT and return the inserted row with ID
 * @param {string} text - INSERT query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Inserted row with id
 */
export const insert = async (text, params = []) => {
  // Ensure query returns the inserted row
  const queryWithReturn = text.includes('RETURNING') ? text : `${text} RETURNING *`;
  const result = await query(queryWithReturn, params);
  return result[0];
};

/**
 * Execute an UPDATE and return affected row count
 * @param {string} text - UPDATE query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Number of rows affected
 */
export const update = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result.rowCount;
};

/**
 * Execute a DELETE and return affected row count
 * @param {string} text - DELETE query
 * @param {Array} params - Query parameters
 * @returns {Promise<number>} Number of rows deleted
 */
export const remove = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result.rowCount;
};

/**
 * Begin a transaction
 * @returns {Promise<Client>} Database client for transaction
 */
export const beginTransaction = async () => {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
};

/**
 * Commit a transaction
 * @param {Client} client - Database client
 */
export const commitTransaction = async (client) => {
  await client.query('COMMIT');
  client.release();
};

/**
 * Rollback a transaction
 * @param {Client} client - Database client
 */
export const rollbackTransaction = async (client) => {
  await client.query('ROLLBACK');
  client.release();
};

/**
 * SQLite-compatible wrapper for better-sqlite3 migration
 * Makes migration easier by providing familiar API
 */
export const dbAsync = {
  run: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (_, i) => `$${params.indexOf(_) + 1}`);
    const result = await pool.query(pgSQL, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  },
  
  get: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (_, i) => `$${params.indexOf(_) + 1}`);
    return await getOne(pgSQL, params);
  },
  
  all: async (sql, params = []) => {
    const pgSQL = sql.replace(/\?/g, (_, i) => `$${params.indexOf(_) + 1}`);
    return await query(pgSQL, params);
  }
};

/**
 * Close all connections (for graceful shutdown)
 */
export const closePool = async () => {
  await pool.end();
  console.log('PostgreSQL pool closed');
};

// Handle process termination
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export default pool;
