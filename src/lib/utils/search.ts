/**
 * @fileoverview Search Utilities
 * @description Utilities for sanitizing and building search filters safely
 */

/**
 * Sanitizes a search term by escaping special ILIKE characters
 * Prevents SQL injection through wildcard abuse in PostgreSQL ILIKE queries
 *
 * @param term - The search term to sanitize
 * @returns The sanitized search term with escaped wildcards
 *
 * @example
 * sanitizeSearchTerm("50%") // Returns "50\\%"
 * sanitizeSearchTerm("test_value") // Returns "test\\_value"
 */
export function sanitizeSearchTerm(term: string): string {
  if (!term) return '';

  // Escape special ILIKE characters: %, _, \
  // These are PostgreSQL wildcards that need escaping
  return term.replace(/[%_\\]/g, '\\$&');
}

/**
 * Builds a PostgREST OR filter for multiple fields with a sanitized search term
 *
 * @param fields - Array of field names to search
 * @param searchTerm - The search term (will be automatically sanitized)
 * @returns A PostgREST OR filter string
 *
 * @example
 * buildSearchFilter(['numero', 'nombre'], 'john')
 * // Returns "numero.ilike.%john%,nombre.ilike.%john%"
 */
export function buildSearchFilter(
  fields: string[],
  searchTerm: string
): string {
  if (!searchTerm || fields.length === 0) return '';

  const sanitized = sanitizeSearchTerm(searchTerm);

  return fields
    .map(field => `${field}.ilike.%${sanitized}%`)
    .join(',');
}

/**
 * Validates that a search term is safe and reasonable
 *
 * @param term - The search term to validate
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (default: 100)
 * @returns true if valid, false otherwise
 */
export function isValidSearchTerm(
  term: string,
  minLength: number = 1,
  maxLength: number = 100
): boolean {
  if (!term) return false;

  const trimmed = term.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}
