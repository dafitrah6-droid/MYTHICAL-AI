import 'dotenv/config';
import express from 'express';
import path from 'path';
import { router } from './api/router';
import { initDb, pool, redisClient } from './db';
import { ObservabilityLogger } from './observability/logger';

const REQUIRED_ENVS = [
  'DATABASE_URL',
  'REDIS_URL',
  'GEMINI_API_KEY',
  'ENCRYPTION_MASTER_KEY'
];

for (const env of REQUIRED_ENVS) {
  if (!process.env[env]) {
    ObservabilityLogger.error('SystemStartup', `CRITICAL: Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' })); 

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    ObservabilityLogger.error('HealthCheck', 'Service health check failed', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.use('/api', router);
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }
});

const startServer = async () => {
  try {
    await initDb();
    const server = app.listen(PORT, () => {
      ObservabilityLogger.info('SystemStartup', `MYTHICAL AI Server running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      ObservabilityLogger.info('SystemShutdown', `Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        ObservabilityLogger.info('SystemShutdown', 'HTTP server closed.');
        try {
          await pool.end();
          if (redisClient.status !== 'end') {
            await redisClient.quit();
          }
          ObservabilityLogger.info('SystemShutdown', 'Database connections closed.');
          process.exit(0);
        } catch (err) {
          ObservabilityLogger.error('SystemShutdown', 'Error during shutdown', err);
          process.exit(1);
        }
      });

      setTimeout(() => {
        ObservabilityLogger.error('SystemShutdown', 'Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    ObservabilityLogger.error('SystemStartup', 'Failed to start server', error);
    process.exit(1);
  }
};

startServer();