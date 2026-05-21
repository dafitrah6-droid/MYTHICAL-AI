import { pool } from '../db';
import crypto from 'crypto';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export class UserService {
  static async getUserProfile(userId: string): Promise<UserProfile> {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }

  static async updateUserProfile(userId: string, name: string, email: string): Promise<UserProfile> {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
      [name, email, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }

  static async getUserApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    const result = await pool.query(
      'SELECT id, name, created_at, last_used_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      maskedKey: '••••••••' + row.id.slice(-6),
      createdAt: row.created_at.toISOString(),
      lastUsedAt: row.last_used_at ? row.last_used_at.toISOString() : null,
    }));
  }

  static async createApiKey(userId: string): Promise<ApiKeyRecord & { value: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const keyId = crypto.randomUUID();
    const name = `Generated key ${new Date().toISOString().slice(0, 10)}`;

    await pool.query(
      'INSERT INTO api_keys (id, user_id, name, token, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [keyId, userId, name, token]
    );

    return {
      id: keyId,
      name,
      maskedKey: `${token.slice(0, 4)}…${token.slice(-4)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      value: token,
    };
  }

  static async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await pool.query('DELETE FROM api_keys WHERE id = $1 AND user_id = $2', [keyId, userId]);
  }

  static async deleteAccount(userId: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}
