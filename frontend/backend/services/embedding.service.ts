import { GoogleGenAI } from '@google/genai';

// Initialize the SDK. Assumes process.env.API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export class EmbeddingService {
  /**
   * Generates a vector embedding for a given text string.
   * Uses the standard text-embedding-004 model for semantic representation.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Validation Error: Invalid text provided for embedding');
    }

    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        throw new Error('Embedding generation failed: No values returned from API');
      }

      return response.embeddings[0].values;
    } catch (error) {
      console.error('Embedding Service Error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
