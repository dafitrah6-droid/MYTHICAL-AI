import 'dotenv/config';
import { Pool } from 'pg';
import { createClient } from 'redis';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}
if (!process.env.REDIS_URL) {
  throw new Error('Missing required environment variable: REDIS_URL');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: () => false,
  },
});

redisClient.on('error', (error) => {
  console.error('Redis Client Error:', error);
});

export const initDb = async (): Promise<void> => {
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

export const closeDb = async (): Promise<void> => {
  try {
    await pool.end();
  } catch (error) {
    console.warn('Error closing PostgreSQL pool:', error);
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'ClientClosedError') {
      return;
    }
    console.warn('Error closing Redis client:', error);
  }
};
