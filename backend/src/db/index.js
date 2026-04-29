const { Pool } = require('pg');
const { logger } = require('../middleware/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'parking_user',
  password: process.env.DB_PASSWORD || 'parking_secure_pass_2024',
  database: process.env.DB_NAME || 'parking_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query detected: ${duration}ms`, { text: text.substring(0, 100) });
    }
    return res;
  } catch (err) {
    logger.error('Database query error:', { text: text.substring(0, 200), error: err.message });
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
