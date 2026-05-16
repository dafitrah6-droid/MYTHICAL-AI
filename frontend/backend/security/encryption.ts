import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Retrieves and validates the master encryption key from the environment.
   */
  private static getKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('Security Configuration Error: ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes).');
    }
    return Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM.
   * Returns a base64 encoded string containing IV + AuthTag + Ciphertext.
   */
  static encrypt(plaintext: string): string {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Encryption Error: Invalid plaintext input.');
    }

    const key = this.getKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    // Format: base64(iv):base64(authTag):ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  }

  /**
   * Decrypts a previously encrypted string.
   */
  static decrypt(encryptedData: string): string {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Decryption Error: Invalid encrypted data input.');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Decryption Error: Invalid encrypted data format.');
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;
    
    const key = this.getKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return plaintext;
    } catch (error) {
      throw new Error('Decryption Error: Authentication failed or data corrupted.');
    }
  }
}
