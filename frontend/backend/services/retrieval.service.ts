import { pool } from '../db';
import { EmbeddingService } from './embedding.service';
import { SearchResult } from '../types';

export class RetrievalService {
  /**
   * Performs a semantic search across a user's processed documents.
   * Uses cosine similarity to find the most relevant document chunks.
   */
  static async semanticSearch(userId: string, query: string, limit: number = 5): Promise<SearchResult[]> {
    // Strict Parameter Validation
    if (!userId || typeof userId !== 'string') {
      throw new Error('Validation Error: Invalid user ID');
    }
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('Validation Error: Invalid search query');
    }
    if (typeof limit !== 'number' || limit <= 0 || limit > 50) {
      throw new Error('Validation Error: Limit must be between 1 and 50');
    }

    try {
      // 1. Generate embedding for the search query
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // 2. Execute vector similarity search
      // The <=> operator in pgvector calculates cosine distance. 
      // Similarity is calculated as 1 - distance.
      const result = await pool.query(`
        SELECT
          dc.content,
          d.filename,
          1 - (dc.embedding <=> $1::vector) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.user_id = $2 AND d.status = 'completed'
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $3
      `, [embeddingStr, userId, limit]);

      // 3. Map and return results
      return result.rows.map(row => ({
        content: row.content,
        filename: row.filename,
        similarity: parseFloat(row.similarity)
      }));

    } catch (error) {
      console.error('Retrieval Service Error:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
