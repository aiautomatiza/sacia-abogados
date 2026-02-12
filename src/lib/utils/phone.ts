/**
 * @fileoverview Frontend Phone Utilities
 * @description Phone number normalization for browser runtime.
 * Mirror of supabase/functions/_shared/phone.ts (normalizePhone only).
 *
 * Convention: phone numbers are stored WITHOUT the '+' prefix in the database.
 * Example: '34666123456' (not '+34666123456')
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
