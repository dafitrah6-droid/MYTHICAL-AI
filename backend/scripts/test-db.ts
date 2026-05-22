import { pool, redisClient, closeDb } from '../config/database.ts';

const main = async () => {
  let isHealthy = true;

  try {
    const client = await pool.connect();
    try {
      const pgResponse = await client.query('SELECT 1 AS ok');
      console.log('Postgres ping result:', pgResponse.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Postgres connection failed:', error);
    isHealthy = false;
  }

  try {
    await redisClient.connect();
    const redisResponse = await redisClient.ping();
    console.log('Redis ping result:', redisResponse);
  } catch (error) {
    console.error('Redis connection failed:', error);
    isHealthy = false;
  }

  try {
    await closeDb();
  } catch (closeError) {
    console.warn('Cleanup error after connection test:', closeError);
  }

  if (!isHealthy) {
    process.exitCode = 1;
  } else {
    console.log('DB and Redis connectivity validated successfully.');
  }
};

main();
