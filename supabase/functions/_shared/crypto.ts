/**
 * @fileoverview Encryption module for tenant credentials
 * @description Uses AES-256-GCM for authenticated encryption of sensitive data
 *
 * Security features:
 * - AES-256-GCM provides confidentiality and authenticity
 * - Random IV for each encryption (prevents pattern analysis)
 * - Authentication tag prevents tampering
 * - Backward compatible with plaintext during migration
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const AUTH_TAG_LENGTH = 128; // bits

// Encrypted format version for future migrations
export const ENCRYPTION_VERSION = 1;

// Prefix to identify encrypted values
const ENCRYPTED_PREFIX = 'enc:v1:';

/**
 * Get or derive the encryption key from environment
 * Uses the first 32 bytes of the master key for AES-256
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const masterKey = Deno.env.get('MASTER_ENCRYPTION_KEY');
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY environment variable not set');
  }

  // Decode base64 master key
  const keyBytes = Uint8Array.from(atob(masterKey), (c) => c.charCodeAt(0));

  if (keyBytes.length < 32) {
    throw new Error('MASTER_ENCRYPTION_KEY must be at least 32 bytes (256 bits)');
  }

  // Use first 32 bytes for AES-256
  return crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0, 32),
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to base64 string
 */
function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Check if a credential value is encrypted
 * Encrypted values start with "enc:v1:" prefix
 */
export function isEncrypted(credential: string | null | undefined): boolean {
  if (!credential) return false;
  return credential.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypts a credential string using AES-256-GCM
 *
 * @param plaintext - The credential to encrypt
 * @returns Encrypted string in format: enc:v1:{iv}:{ciphertext}
 *
 * @example
 * const encrypted = await encryptCredential('my-api-key');
 * // Returns: "enc:v1:abc123...:def456..."
 */
export async function encryptCredential(plaintext: string): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty credential');
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    console.warn('[Crypto] Credential is already encrypted, returning as-is');
    return plaintext;
  }

  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt with AES-GCM (includes authentication tag)
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    data
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);

  // Format: enc:v1:{iv_base64}:{ciphertext_base64}
  return `${ENCRYPTED_PREFIX}${toBase64(iv)}:${toBase64(encryptedArray)}`;
}

/**
 * Decrypts a credential string encrypted with encryptCredential()
 *
 * @param encrypted - The encrypted credential
 * @returns Decrypted plaintext credential
 *
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decryptCredential(encrypted: string): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty credential');
  }

  // Handle plaintext credentials (backward compatibility during migration)
  if (!isEncrypted(encrypted)) {
    console.warn('[Crypto] Credential is not encrypted (plaintext), returning as-is');
    return encrypted;
  }

  // Remove prefix and split
  const withoutPrefix = encrypted.slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, ciphertextBase64] = withoutPrefix.split(':');

  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted credential format');
  }

  const key = await getEncryptionKey();
  const iv = fromBase64(ivBase64);
  const ciphertext = fromBase64(ciphertextBase64);

  // Decrypt with AES-GCM (validates authentication tag)
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: AUTH_TAG_LENGTH,
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Safely encrypt a credential, handling objects and null values
 * Used by admin service when storing credentials
 */
export async function safeEncrypt(
  value: string | Record<string, unknown> | null | undefined
): Promise<string | null> {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  return encryptCredential(stringValue);
}

/**
 * Safely decrypt a credential, returning null on failure
 * Used by services when reading credentials
 */
export async function safeDecrypt(
  encrypted: string | null | undefined
): Promise<string | null> {
  if (!encrypted) {
    return null;
  }

  try {
    return await decryptCredential(encrypted);
  } catch (error) {
    console.error('[Crypto] Failed to decrypt credential:', error);
    return null;
  }
}
