import { pool } from '../db';

export interface StreamCallback {
  (chunk: string): void;
}

/**
 * Multi-provider AI service supporting Gemini, Claude, and GPT
 */
export class AiService {
  static async processStream(
    userId: string,
    message: string,
    provider: 'gemini' | 'claude' | 'gpt' = 'gemini',
    onChunk?: StreamCallback
  ): Promise<string> {
    // Validate provider config in DB or env
    const apiKey = await this.getProviderApiKey(userId, provider);
    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${provider}`);
    }

    let fullResponse = '';

    try {
      if (provider === 'gemini') {
        fullResponse = await this.streamGemini(message, apiKey, onChunk);
      } else if (provider === 'claude') {
        fullResponse = await this.streamClaude(message, apiKey, onChunk);
      } else if (provider === 'gpt') {
        fullResponse = await this.streamGpt(message, apiKey, onChunk);
      }
    } catch (error) {
      console.error(`[AI Service] ${provider} streaming error:`, error);
      throw error;
    }

    return fullResponse;
  }

  /**
   * Stream response from Google Gemini
   * Fixed to support Gemini's NDJSON/Array stream format
   */
  private static async streamGemini(
    message: string,
    apiKey: string,
    onChunk?: StreamCallback
  ): Promise<string> {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent';
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Gemini');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Gemini sends an array of objects [{},{}] in chunks.
        // We need to parse individual JSON objects from the stream.
        let cleanedBuffer = buffer.trim();
        if (cleanedBuffer.startsWith('[')) cleanedBuffer = cleanedBuffer.slice(1);
        if (cleanedBuffer.endsWith(']')) cleanedBuffer = cleanedBuffer.slice(0, -1);
        if (cleanedBuffer.startsWith(',')) cleanedBuffer = cleanedBuffer.slice(1);

        try {
          // Wrap in brackets to handle multiple objects in one chunk if necessary
          const jsonObjects = JSON.parse(`[${cleanedBuffer}]`);
          for (const obj of jsonObjects) {
            const text = obj.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullResponse += text;
              onChunk?.(text);
            }
          }
          buffer = ''; // Reset buffer on successful parse
        } catch (e) {
          // Keep buffering until we have a complete JSON object
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Stream response from Anthropic Claude
   */
  private static async streamClaude(
    message: string,
    apiKey: string,
    onChunk?: StreamCallback
  ): Promise<string> {
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content: message }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Claude');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(trimmedLine.slice(6));
            if (data.type === 'content_block_delta') {
              const text = data.delta?.text || '';
              if (text) {
                fullResponse += text;
                onChunk?.(text);
              }
            }
          } catch (e) {
            // Ignore partial JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Stream response from OpenAI GPT
   */
  private static async streamGpt(
    message: string,
    apiKey: string,
    onChunk?: StreamCallback
  ): Promise<string> {
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
        max_tokens: 2048,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GPT API error: ${err}`);
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from GPT');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data: ')) continue;
          if (trimmedLine === 'data: [DONE]') continue;

          try {
            const data = JSON.parse(trimmedLine.slice(6));
            const text = data.choices?.[0]?.delta?.content || '';
            if (text) {
              fullResponse += text;
              onChunk?.(text);
            }
          } catch (e) {
            // Partial JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Get API key for provider from user's saved keys or environment
   */
  private static async getProviderApiKey(
    userId: string,
    provider: 'gemini' | 'claude' | 'gpt'
  ): Promise<string | null> {
    // Try to get from user's stored API keys first
    try {
      const result = await pool.query(
        'SELECT token FROM api_keys WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
        [userId, `%${provider}%`]
      );
      if (result.rows.length > 0) {
        return result.rows[0].token;
      }
    } catch (error) {
      console.warn('Failed to fetch API key from DB:', error);
    }

    // Fall back to environment variables (loaded from .env via dotenv)
    const envKey = {
      'gemini': process.env.GEMINI_API_KEY,
      'claude': process.env.CLAUDE_API_KEY,
      'gpt': process.env.OPENAI_API_KEY,
    }[provider];

    if (envKey) {
      console.debug(`[AiService] Using ${provider} API key from environment`);
    }

    return envKey || null;
  }
}