import { pool } from '../db';
import { DbMemory } from '../types';

export class MemoryService {
  static async addMemory(userId: string, category: string, content: string): Promise<DbMemory> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');
    if (!category || typeof category !== 'string') throw new Error('Validation Error: Invalid category');
    if (!content || typeof content !== 'string') throw new Error('Validation Error: Invalid content');

    const result = await pool.query<DbMemory>(
      'INSERT INTO memories (user_id, category, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, category, content]
    );
    return result.rows[0];
  }

  static async getUserMemories(userId: string): Promise<DbMemory[]> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');

    const result = await pool.query<DbMemory>(
      'SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async deleteMemory(userId: string, memoryId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');
    if (!memoryId || typeof memoryId !== 'string') throw new Error('Validation Error: Invalid memory ID');

    await pool.query(
      'DELETE FROM memories WHERE id = $1 AND user_id = $2',
      [memoryId, userId]
    );
  }
}
