import { SecurityLogger } from './logger';

export class SecurityValidators {
  // Heuristic patterns for detecting common prompt injection attacks
  private static readonly INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /you are now/i,
    /bypass/i,
    /forget (everything|previous)/i,
    /print your instructions/i,
    /developer mode/i,
    /DAN mode/i
  ];

  /**
   * Sanitizes input strings to prevent XSS and basic injection.
   * Strips HTML tags and normalizes whitespace.
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  /**
   * Analyzes a prompt for potential injection attacks.
   * Returns true if safe, false if malicious.
   */
  static isPromptSafe(prompt: string, ipAddress: string, userId?: string): boolean {
    if (typeof prompt !== 'string') return false;

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        SecurityLogger.logEvent(
          'prompt_injection',
          `Detected potential prompt injection matching pattern: ${pattern.source}`,
          ipAddress,
          userId
        );
        return false;
      }
    }

    // Check for excessive length (potential buffer overflow or context window attack)
    if (prompt.length > 32000) {
      SecurityLogger.logEvent(
        'malicious_payload',
        'Prompt exceeds maximum allowed length (32000 chars).',
        ipAddress,
        userId
      );
      return false;
    }

    return true;
  }

  /**
   * Validates UUID v4 format to prevent SQL injection via ID parameters.
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
  }
}
