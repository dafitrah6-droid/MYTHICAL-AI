import { pool, redisClient } from '../db';
import { ObservabilityLogger } from './logger';

export class MetricsCollector {
  /**
   * Records latency (execution time) for a specific operation.
   * Persists to PostgreSQL for historical analysis.
   */
  static async recordLatency(metricName: string, durationMs: number, tags: Record<string, string> = {}): Promise<void> {
    if (!metricName || typeof metricName !== 'string') return;
    if (typeof durationMs !== 'number' || durationMs < 0) return;

    try {
      // Fire and forget
      pool.query(
        'INSERT INTO system_metrics (metric_name, metric_type, value, tags) VALUES ($1, $2, $3, $4)',
        [metricName, 'latency', durationMs, JSON.stringify(tags)]
      ).catch(err => {
        ObservabilityLogger.error('MetricsCollector', `Failed to record latency for ${metricName}`, err);
      });
    } catch (err) {
      ObservabilityLogger.error('MetricsCollector', 'Critical failure in latency recording', err);
    }
  }

  /**
   * Increments a counter metric (e.g., error frequency, tool usage).
   * Uses Redis for real-time aggregation and PostgreSQL for persistence.
   */
  static async incrementCounter(metricName: string, value: number = 1, tags: Record<string, string> = {}): Promise<void> {
    if (!metricName || typeof metricName !== 'string') return;
    if (typeof value !== 'number') return;

    try {
      // 1. Persist to PostgreSQL for long-term storage
      pool.query(
        'INSERT INTO system_metrics (metric_name, metric_type, value, tags) VALUES ($1, $2, $3, $4)',
        [metricName, 'counter', value, JSON.stringify(tags)]
      ).catch(err => {
        ObservabilityLogger.error('MetricsCollector', `Failed to persist counter for ${metricName}`, err);
      });

      // 2. Update Redis for real-time monitoring and alerting
      const redisKey = `metric:counter:${metricName}`;
      await redisClient.incrBy(redisKey, value);
      
    } catch (err) {
      ObservabilityLogger.error('MetricsCollector', 'Critical failure in counter increment', err);
    }
  }
}
