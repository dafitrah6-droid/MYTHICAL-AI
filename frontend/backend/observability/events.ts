import { redisClient } from '../db';
import { ObservabilityLogger } from './logger';
import { MetricsCollector } from './metrics';

export class EventTracker {
  /**
   * Tracks standard user activity and routes it through the anomaly detection engine.
   */
  static async trackUserActivity(userId: string, activityType: string, metadata: Record<string, any> = {}): Promise<void> {
    if (!userId || typeof userId !== 'string') return;
    if (!activityType || typeof activityType !== 'string') return;

    // Log the activity
    ObservabilityLogger.info('UserActivity', `User performed ${activityType}`, { userId, activityType, ...metadata });
    
    // Increment activity metric
    MetricsCollector.incrementCounter(`activity_${activityType}`, 1, { userId });

    // Run anomaly detection
    await this.detectAbnormalBehavior(userId, activityType);
  }

  /**
   * Detects abnormal behavior using a Redis-backed sliding window mechanism.
   * Identifies spikes in specific activities (e.g., rapid tool execution, mass file uploads).
   */
  private static async detectAbnormalBehavior(userId: string, activityType: string): Promise<void> {
    // Configuration for anomaly thresholds
    const windowSeconds = 60; // 1 minute window
    const threshold = 50; // Max 50 actions per minute per type
    
    const key = `anomaly_window:${userId}:${activityType}`;

    try {
      const currentCount = await redisClient.incr(key);
      
      // Set expiration on the first increment to create the sliding window
      if (currentCount === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      // Trigger anomaly alert if threshold is breached
      if (currentCount > threshold) {
        ObservabilityLogger.warn('AnomalyDetection', `Abnormal behavior detected for user`, {
          userId,
          activityType,
          count: currentCount,
          windowSeconds
        });
        
        // Record the anomaly metric for dashboarding
        MetricsCollector.incrementCounter('abnormal_behavior_detected', 1, { 
          userId, 
          activityType 
        });
      }
    } catch (error) {
      ObservabilityLogger.error('AnomalyDetection', 'Failed to process anomaly detection window', error);
    }
  }
}
