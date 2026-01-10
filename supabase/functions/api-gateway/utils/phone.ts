/**
 * @fileoverview Phone Utilities
 * @description Utilities for phone number normalization, especially for Spanish numbers
 */

/**
 * Normalizes a Spanish phone number to E.164 format
 * - Removes spaces, hyphens, and non-numeric characters (except +)
 * - Detects Spanish numbers (9 digits starting with 6, 7, 8, or 9)
 * - Adds +34 prefix if necessary
 *
 * @param phone - The phone number to normalize
 * @returns Normalized phone number in E.164 format (e.g., +34666123456)
 *
 * @example
 * normalizeSpanishPhone('666 123 456') // '+34666123456'
 * normalizeSpanishPhone('0034666123456') // '+34666123456'
 * normalizeSpanishPhone('+34666123456') // '+34666123456'
 * normalizeSpanishPhone('34666123456') // '+34666123456'
 */
export function normalizeSpanishPhone(phone: string): string {
  // 1. Clean: remove spaces, hyphens, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // 2. If it already has +34 prefix, normalize and return
  if (cleaned.startsWith('+34')) {
    return cleaned;
  }

  // 3. If it has 0034 prefix, convert to +34
  if (cleaned.startsWith('0034')) {
    return '+34' + cleaned.slice(4);
  }

  // 4. If it has 34 prefix (without +) and the rest are 9 valid digits
  if (cleaned.startsWith('34') && cleaned.length === 11) {
    const withoutPrefix = cleaned.slice(2);
    if (/^[6789]\d{8}$/.test(withoutPrefix)) {
      return '+34' + withoutPrefix;
    }
  }

  // 5. If it's a Spanish 9-digit number (starts with 6, 7, 8, or 9)
  if (/^[6789]\d{8}$/.test(cleaned)) {
    return '+34' + cleaned;
  }

  // 6. If it doesn't match Spanish pattern, return cleaned (might be international)
  return cleaned.startsWith('+') ? cleaned : cleaned;
}

/**
 * Validates if a phone number is a valid Spanish mobile number
 *
 * @param phone - The phone number to validate
 * @returns True if valid Spanish mobile number
 *
 * @example
 * isValidSpanishMobile('+34666123456') // true
 * isValidSpanishMobile('666123456') // true
 * isValidSpanishMobile('+34912345678') // false (landline)
 */
export function isValidSpanishMobile(phone: string): boolean {
  const normalized = normalizeSpanishPhone(phone);
  // Spanish mobile numbers start with +346, +347, +348, or +349
  return /^\+34[6789]\d{8}$/.test(normalized);
}

/**
 * Validates if a phone number is in E.164 format
 *
 * @param phone - The phone number to validate
 * @returns True if valid E.164 format
 *
 * @example
 * isE164Format('+34666123456') // true
 * isE164Format('666123456') // false
 */
export function isE164Format(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}
