import { performance } from 'perf_hooks';
import { MetricsCollector } from './metrics';
import { ObservabilityLogger } from './logger';

export class PerformanceMonitor {
  /**
   * Wraps an asynchronous operation to automatically track its execution time,
   * success rate, and error frequency.
   */
  static async trackExecution<T>(
    operationName: string,
    tags: Record<string, string>,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!operationName || typeof operationName !== 'string') {
      throw new Error('Validation Error: Invalid operation name for performance tracking');
    }
    if (typeof operation !== 'function') {
      throw new Error('Validation Error: Operation must be a function');
    }

    const startTime = performance.now();
    let status = 'success';

    try {
      const result = await operation();
      return result;
    } catch (error) {
      status = 'error';
      
      // Track error frequency
      MetricsCollector.incrementCounter(`${operationName}_errors`, 1, {
        ...tags,
        error_type: error instanceof Error ? error.name : 'UnknownError'
      });
      
      throw error;
    } finally {
      const durationMs = performance.now() - startTime;
      
      // Record latency
      MetricsCollector.recordLatency(operationName, durationMs, { ...tags, status });
      
      // Detect and log abnormally slow operations (e.g., > 10 seconds)
      if (durationMs > 10000) {
        ObservabilityLogger.warn('PerformanceMonitor', `Slow operation detected: ${operationName}`, { 
          durationMs, 
          tags 
        });
      }
    }
  }
}
