import { pool } from '../db';
import { EmbeddingService } from './embedding.service';
import pdfParse from 'pdf-parse';

export class DocumentPipeline {
  /**
   * Processes an uploaded document: validates, parses, chunks, embeds, and stores in the database.
   */
  static async processDocument(userId: string, filename: string, mimeType: string, buffer: Buffer): Promise<string> {
    // 1. Strict Parameter Validation
    if (!userId || typeof userId !== 'string') throw new Error('Validation Error: Invalid user ID');
    if (!filename || typeof filename !== 'string') throw new Error('Validation Error: Invalid filename');
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Validation Error: Invalid file buffer');

    const supportedTypes = ['text/plain', 'application/json', 'application/pdf'];
    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Validation Error: Unsupported file type ${mimeType}. Only TXT, JSON, and PDF are supported.`);
    }

    let extractedText = '';

    // 2. Safe Parsing & Extraction
    try {
      if (mimeType === 'text/plain') {
        extractedText = buffer.toString('utf-8');
      } else if (mimeType === 'application/json') {
        // Validate JSON structure and stringify for semantic processing
        const parsed = JSON.parse(buffer.toString('utf-8'));
        extractedText = JSON.stringify(parsed, null, 2);
      } else if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      }
    } catch (error) {
      throw new Error('Processing Error: File is corrupted or cannot be parsed safely.');
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Processing Error: No readable text could be extracted from the file.');
    }

    // 3. Initialize Document Record
    const docResult = await pool.query(
      'INSERT INTO documents (user_id, filename, mime_type, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, filename, mimeType, 'processing']
    );
    const documentId = docResult.rows[0].id;

    // 4. Chunking and Embedding Flow
    try {
      // Chunk text into ~500 word segments with 100 word overlap to preserve context boundaries
      const chunks = this.chunkText(extractedText, 500, 100);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await EmbeddingService.generateEmbedding(chunk);
        
        // Format array for pgvector insertion: '[val1, val2, ...]'
        const embeddingStr = `[${embedding.join(',')}]`;

        await pool.query(
          'INSERT INTO document_chunks (document_id, content, embedding, chunk_index) VALUES ($1, $2, $3, $4)',
          [documentId, chunk, embeddingStr, i]
        );
      }

      // Mark as completed
      await pool.query('UPDATE documents SET status = $1 WHERE id = $2', ['completed', documentId]);
      return documentId;

    } catch (error) {
      // Handle failures safely by updating status
      await pool.query('UPDATE documents SET status = $1 WHERE id = $2', ['failed', documentId]);
      throw new Error(`Pipeline Error: Failed to process document chunks - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Splits text into overlapping chunks based on word count.
   */
  private static chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chunks: string[] = [];
    let i = 0;
    
    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
      i += (chunkSize - overlap);
    }
    
    return chunks;
  }
}
