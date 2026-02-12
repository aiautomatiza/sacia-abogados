/**
 * @fileoverview Shared Phone Utilities
 * @description Centralized phone number normalization for all edge functions.
 *
 * Convention: phone numbers are stored WITHOUT the '+' prefix in the database.
 * Example: '34666123456' (not '+34666123456')
 *
 * Exception: whatsapp_numbers.phone_number keeps E.164 format with '+' (Meta API requirement).
 * Use toE164() when sending to external APIs that require the '+' prefix.
 */

/**
 * Normalizes a phone number for database storage (without '+' prefix).
 *
 * - Removes spaces, hyphens, parentheses, dots
 * - Strips leading '+' if present
 * - Converts '00' international prefix to digits
 * - Detects Spanish 9-digit numbers (starting with 6/7/8/9) and prepends '34'
 *
 * @param phone - The phone number to normalize
 * @returns Normalized phone number without '+' prefix (e.g., '34666123456')
 *
 * @example
 * normalizePhone('+34666123456')   // '34666123456'
 * normalizePhone('666 123 456')    // '34666123456'
 * normalizePhone('0034666123456')  // '34666123456'
 * normalizePhone('34666123456')    // '34666123456'
 * normalizePhone('+44770012345')   // '44770012345'
 */
export function normalizePhone(phone: string): string {
  // 1. Clean: remove spaces, hyphens, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // 2. Strip leading '+' if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // 3. Convert '00' international prefix to digits
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // 4. Detect Spanish 9-digit number (starts with 6, 7, 8, or 9) and prepend '34'
  if (/^[6789]\d{8}$/.test(cleaned)) {
    cleaned = '34' + cleaned;
  }

  return cleaned;
}

/**
 * Validates if a phone number is a valid Spanish mobile number.
 * Accepts both normalized (without '+') and raw formats.
 *
 * @param phone - The phone number to validate
 * @returns True if valid Spanish mobile number
 *
 * @example
 * isValidSpanishMobile('34666123456')  // true
 * isValidSpanishMobile('+34666123456') // true
 * isValidSpanishMobile('666123456')    // true
 * isValidSpanishMobile('34912345678')  // false (landline)
 */
export function isValidSpanishMobile(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^34[6789]\d{8}$/.test(normalized);
}

/**
 * Validates if a phone number is in the normalized storage format
 * (digits only, starts with country code, no '+').
 *
 * @param phone - The phone number to validate
 * @returns True if in normalized format
 *
 * @example
 * isNormalizedFormat('34666123456') // true
 * isNormalizedFormat('+34666123456') // false (has '+')
 * isNormalizedFormat('666123456')    // false (no country code for 9 digits)
 */
export function isNormalizedFormat(phone: string): boolean {
  return /^[1-9]\d{1,14}$/.test(phone);
}

/**
 * Converts a normalized phone number to E.164 format (with '+' prefix).
 * Use this ONLY when sending to external APIs that require E.164 (e.g., Meta WhatsApp API).
 *
 * @param phone - Normalized phone number (without '+')
 * @returns Phone number in E.164 format (e.g., '+34666123456')
 *
 * @example
 * toE164('34666123456') // '+34666123456'
 * toE164('44770012345') // '+44770012345'
 */
export function toE164(phone: string): string {
  const normalized = normalizePhone(phone);
  return '+' + normalized;
}
