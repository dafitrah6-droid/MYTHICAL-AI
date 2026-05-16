import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { MetricsCollector } from '../../observability/metrics';

export class ObservabilityMiddleware {
  /**
   * Middleware to track API request latency, status codes, and error frequencies.
   */
  static trackApiMetrics(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();
    
    // Hook into the response 'finish' event to calculate total duration
    res.on('finish', () => {
      const durationMs = performance.now() - startTime;
      
      // Fallback to req.path if route is not resolved (e.g., 404s)
      const route = req.route ? req.route.path : req.path;
      const statusCode = res.statusCode.toString();
      
      const tags = {
        method: req.method,
        route: route,
        status_code: statusCode
      };

      // Record API Latency
      MetricsCollector.recordLatency('api_request_latency', durationMs, tags);

      // Track Error Frequency (4xx and 5xx)
      if (res.statusCode >= 400) {
        MetricsCollector.incrementCounter('api_error_frequency', 1, tags);
      }
    });

    next();
  }
}
