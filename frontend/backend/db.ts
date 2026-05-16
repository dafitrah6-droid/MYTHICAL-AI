import { Pool } from 'pg';
import { createClient } from 'redis';

// PostgreSQL Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis Cache Client
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Initialize connections (to be called at server startup)
export const initDb = async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully.');
    
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connected successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};
