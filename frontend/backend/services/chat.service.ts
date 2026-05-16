import { pool } from '../db';
import { DbConversation, DbMessage, DbFile } from '../types';

export class ChatService {
  static async createConversation(userId: string, title: string): Promise<DbConversation> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');
    if (!title || typeof title !== 'string') throw new Error('Validation Error: Invalid title');

    const result = await pool.query<DbConversation>(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
      [userId, title]
    );
    return result.rows[0];
  }

  static async getConversations(userId: string): Promise<DbConversation[]> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');

    const result = await pool.query<DbConversation>(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async addMessage(
    conversationId: string, 
    role: 'user' | 'assistant' | 'system', 
    content: string, 
    reasoning?: string
  ): Promise<DbMessage> {
    if (!conversationId || typeof conversationId !== 'string') throw new Error('Validation Error: Invalid conversation ID');
    if (!['user', 'assistant', 'system'].includes(role)) throw new Error('Validation Error: Invalid role');
    if (!content || typeof content !== 'string') throw new Error('Validation Error: Invalid content');
    if (reasoning !== undefined && typeof reasoning !== 'string') throw new Error('Validation Error: Invalid reasoning format');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<DbMessage>(
        'INSERT INTO messages (conversation_id, role, content, reasoning) VALUES ($1, $2, $3, $4) RETURNING *',
        [conversationId, role, content, reasoning || null]
      );
      
      await client.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', 
        [conversationId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async saveFileMetadata(
    userId: string, 
    messageId: string | null, 
    name: string, 
    size: number, 
    mimeType: string, 
    storagePath: string
  ): Promise<DbFile> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');
    if (messageId !== null && typeof messageId !== 'string') throw new Error('Validation Error: Invalid message ID');
    if (!name || typeof name !== 'string') throw new Error('Validation Error: Invalid file name');
    if (typeof size !== 'number' || size <= 0) throw new Error('Validation Error: Invalid file size');
    if (!mimeType || typeof mimeType !== 'string') throw new Error('Validation Error: Invalid mime type');
    if (!storagePath || typeof storagePath !== 'string') throw new Error('Validation Error: Invalid storage path');

    const result = await pool.query<DbFile>(
      'INSERT INTO files (user_id, message_id, name, size, mime_type, storage_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, messageId, name, size, mimeType, storagePath]
    );
    return result.rows[0];
  }
}
