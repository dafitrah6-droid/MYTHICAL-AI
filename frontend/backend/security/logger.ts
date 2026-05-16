import { pool } from '../db';

export class SecurityLogger {
  /**
   * Logs suspicious or critical security events to the database for auditing.
   */
  static async logEvent(
    eventType: 'auth_failure' | 'rate_limit' | 'prompt_injection' | 'unauthorized_access' | 'malicious_payload',
    description: string,
    ipAddress: string,
    userId?: string
  ): Promise<void> {
    try {
      // In a full deployment, this table would need to be added to schema.sql
      // CREATE TABLE security_logs (id UUID, user_id UUID, event_type VARCHAR, description TEXT, ip_address VARCHAR, created_at TIMESTAMP);
      
      console.warn(`[SECURITY ALERT] [${eventType}] IP: ${ipAddress} | User: ${userId || 'Anonymous'} | ${description}`);
      
      // Fire and forget to avoid blocking the main thread
      pool.query(
        'INSERT INTO security_logs (user_id, event_type, description, ip_address) VALUES ($1, $2, $3, $4)',
        [userId || null, eventType, description, ipAddress]
      ).catch(err => console.error('Failed to write security log to DB:', err));
      
    } catch (error) {
      console.error('Critical failure in SecurityLogger:', error);
    }
  }
}
