import { pool, redisClient } from '../db';
import { DbSession, DbUser } from '../types';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export class AuthService {
  /**
   * Authenticates a user with email and password, returns session token if valid.
   */
  static async authenticateUser(email: string, password: string): Promise<string> {
    if (!email || typeof email !== 'string') {
      throw new Error('Validation Error: Invalid email');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Validation Error: Invalid password');
    }

    const result = await pool.query<DbUser>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Authentication Error: Invalid email or password');
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Authentication Error: Invalid email or password');
    }

    return this.createSession(user.id);
  }

  /**
   * Creates a new session for a user, persisting it in PostgreSQL and caching in Redis.
   */
  static async createSession(userId: string): Promise<string> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Validation Error: Invalid user ID');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresInDays = 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Persist in PostgreSQL
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // Cache in Redis (TTL in seconds)
    const ttlSeconds = expiresInDays * 24 * 60 * 60;
    await redisClient.setEx(`session:${token}`, ttlSeconds, userId);

    return token;
  }

  /**
   * Validates a session token. Checks Redis cache first, falls back to PostgreSQL.
   */
  static async validateSession(token: string): Promise<string | null> {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // 1. Check Redis Cache
    const cachedUserId = await redisClient.get(`session:${token}`);
    if (cachedUserId) {
      return cachedUserId;
    }

    // 2. Fallback to PostgreSQL
    const result = await pool.query<DbSession>(
      'SELECT user_id, expires_at FROM sessions WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];

    // 3. Check expiration
    if (new Date() > session.expires_at) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
      return null;
    }

    // 4. Restore Cache
    const ttlSeconds = Math.floor((session.expires_at.getTime() - Date.now()) / 1000);
    if (ttlSeconds > 0) {
      await redisClient.setEx(`session:${token}`, ttlSeconds, session.user_id);
    }

    return session.user_id;
  }

  /**
   * Revokes a session by removing it from both PostgreSQL and Redis.
   */
  static async revokeSession(token: string): Promise<void> {
    if (!token || typeof token !== 'string') {
      throw new Error('Validation Error: Invalid token');
    }

    await redisClient.del(`session:${token}`);
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }
}
