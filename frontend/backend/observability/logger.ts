import { pool } from '../db';

export class ObservabilityLogger {
  /**
   * Logs informational messages in a structured JSON format.
   */
  static info(context: string, message: string, meta?: Record<string, any>): void {
    if (!context || !message) return;
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      context,
      message,
      meta
    }));
  }

  /**
   * Logs warnings for non-critical issues or abnormal behavior.
   */
  static warn(context: string, message: string, meta?: Record<string, any>): void {
    if (!context || !message) return;
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      context,
      message,
      meta
    }));
  }

  /**
   * Logs errors with stack traces for debugging.
   */
  static error(context: string, message: string, error?: any): void {
    if (!context || !message) return;
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      context,
      message,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    }));
  }

  /**
   * Safely stores critical actions in the PostgreSQL audit_logs table.
   * Used for compliance, security tracking, and historical auditing.
   */
  static async audit(
    userId: string, 
    action: string, 
    resourceType: string, 
    resourceId: string | null, 
    metadata: Record<string, any>, 
    ipAddress: string
  ): Promise<void> {
    if (!userId || typeof userId !== 'string') return;
    if (!action || typeof action !== 'string') return;
    if (!resourceType || typeof resourceType !== 'string') return;

    try {
      // Fire and forget to prevent blocking the main execution thread
      pool.query(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, action, resourceType, resourceId, JSON.stringify(metadata), ipAddress]
      ).catch(err => {
        this.error('AuditLogger', 'Failed to persist audit log to database', err);
      });
    } catch (err) {
      this.error('AuditLogger', 'Critical failure in audit logging mechanism', err);
    }
  }
}
