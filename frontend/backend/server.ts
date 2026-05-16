import express from 'express';
import path from 'path';
import { router } from './api/router';
import { initDb, pool, redisClient } from './db';
import { ObservabilityLogger } from './observability/logger';

// 1. Strict Environment Variable Validation
const REQUIRED_ENVS = [
  'DATABASE_URL',
  'REDIS_URL',
  'API_KEY',
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

// Support large file uploads for document processing
app.use(express.json({ limit: '50mb' })); 

// 2. Monitoring Hooks & Health Checks for Kubernetes Probes
app.get('/health', async (req, res) => {
  try {
    // Verify Database Connection
    await pool.query('SELECT 1');
    // Verify Redis Connection
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

// 3. Mount API and Static Files
app.use('/api', router);
app.use(express.static(path.join(__dirname, '../../'))); // Serve frontend assets

// 4. Initialization and Graceful Shutdown
const startServer = async () => {
  try {
    await initDb();
    const server = app.listen(PORT, () => {
      ObservabilityLogger.info('SystemStartup', `MYTHICAL AI Server running on port ${PORT}`);
    });

    // Graceful Shutdown Handler for Kubernetes Pod Termination
    const shutdown = async (signal: string) => {
      ObservabilityLogger.info('SystemShutdown', `Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        ObservabilityLogger.info('SystemShutdown', 'HTTP server closed.');
        try {
          await pool.end();
          await redisClient.quit();
          ObservabilityLogger.info('SystemShutdown', 'Database connections closed.');
          process.exit(0);
        } catch (err) {
          ObservabilityLogger.error('SystemShutdown', 'Error during shutdown', err);
          process.exit(1);
        }
      });

      // Force shutdown if graceful shutdown fails after 10 seconds
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
