/**
 * @fileoverview Tests for Search Utilities
 * @description Critical security tests for SQL injection prevention
 */

import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm, buildSearchFilter, isValidSearchTerm } from '../search';

describe('sanitizeSearchTerm', () => {
  describe('Basic functionality', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeSearchTerm('')).toBe('');
    });

    it('should not modify safe strings', () => {
      const safeStrings = [
        'john doe',
        'test',
        'email@example.com',
        '1234567890',
        'user-name',
      ];

      safeStrings.forEach((str) => {
        expect(sanitizeSearchTerm(str)).toBe(str);
      });
    });
  });

  describe('Wildcard escaping', () => {
    it('should escape % wildcard', () => {
      expect(sanitizeSearchTerm('50%')).toBe('50\\%');
      expect(sanitizeSearchTerm('%discount%')).toBe('\\%discount\\%');
      expect(sanitizeSearchTerm('100%')).toBe('100\\%');
    });

    it('should escape _ wildcard', () => {
      expect(sanitizeSearchTerm('test_value')).toBe('test\\_value');
      expect(sanitizeSearchTerm('_prefix')).toBe('\\_prefix');
      expect(sanitizeSearchTerm('suffix_')).toBe('suffix\\_');
    });

    it('should escape \\ backslash', () => {
      expect(sanitizeSearchTerm('path\\to\\file')).toBe('path\\\\to\\\\file');
      expect(sanitizeSearchTerm('\\')).toBe('\\\\');
      expect(sanitizeSearchTerm('\\test')).toBe('\\\\test');
    });

    it('should escape multiple special characters', () => {
      expect(sanitizeSearchTerm('50% of _users')).toBe('50\\% of \\_users');
      expect(sanitizeSearchTerm('%_\\')).toBe('\\%\\_\\\\');
      expect(sanitizeSearchTerm('test_%\\value')).toBe('test\\_\\%\\\\value');
    });
  });

  describe('SQL injection prevention', () => {
    it('should handle SQL injection attempts', () => {
      const injectionAttempts = [
        "'; DROP TABLE users;--",
        "' OR '1'='1",
        "1'; DELETE FROM users WHERE '1'='1",
        "admin'--",
        "' UNION SELECT * FROM passwords--",
      ];

      injectionAttempts.forEach((attempt) => {
        const sanitized = sanitizeSearchTerm(attempt);
        // Ensure no wildcards remain unescaped
        expect(sanitized).not.toContain('%');
        expect(sanitized).not.toContain('_');
        if (attempt.includes('%')) {
          expect(sanitized).toContain('\\%');
        }
        if (attempt.includes('_')) {
          expect(sanitized).toContain('\\_');
        }
      });
    });

    it('should prevent wildcard abuse', () => {
      // Attackers might try to use % to match everything
      expect(sanitizeSearchTerm('%')).toBe('\\%');
      expect(sanitizeSearchTerm('%%%%')).toBe('\\%\\%\\%\\%');
      expect(sanitizeSearchTerm('____')).toBe('\\_\\_\\_\\_');
    });
  });

  describe('Edge cases', () => {
    it('should handle strings with only special characters', () => {
      expect(sanitizeSearchTerm('%_\\')).toBe('\\%\\_\\\\');
      expect(sanitizeSearchTerm('\\_')).toBe('\\\\\\_');
      expect(sanitizeSearchTerm('\\%')).toBe('\\\\\\%');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000) + '%' + 'b'.repeat(1000);
      const sanitized = sanitizeSearchTerm(longString);
      expect(sanitized).toContain('\\%');
      expect(sanitized.length).toBe(longString.length + 1); // +1 for backslash
    });

    it('should handle unicode characters', () => {
      expect(sanitizeSearchTerm('café')).toBe('café');
      expect(sanitizeSearchTerm('日本語')).toBe('日本語');
      expect(sanitizeSearchTerm('emoji 🚀')).toBe('emoji 🚀');
      expect(sanitizeSearchTerm('café%')).toBe('café\\%');
    });
  });
});

describe('buildSearchFilter', () => {
  describe('Basic functionality', () => {
    it('should build OR filter for single field', () => {
      const filter = buildSearchFilter(['numero'], 'john');
      expect(filter).toBe('numero.ilike.%john%');
    });

    it('should build OR filter for multiple fields', () => {
      const filter = buildSearchFilter(['numero', 'nombre'], 'john');
      expect(filter).toBe('numero.ilike.%john%,nombre.ilike.%john%');
    });

    it('should build OR filter for many fields', () => {
      const filter = buildSearchFilter(['field1', 'field2', 'field3', 'field4'], 'test');
      expect(filter).toBe('field1.ilike.%test%,field2.ilike.%test%,field3.ilike.%test%,field4.ilike.%test%');
    });

    it('should return empty string for no fields', () => {
      const filter = buildSearchFilter([], 'john');
      expect(filter).toBe('');
    });

    it('should return empty string for empty search term', () => {
      const filter = buildSearchFilter(['numero', 'nombre'], '');
      expect(filter).toBe('');
    });

    it('should return empty string for empty fields and empty term', () => {
      const filter = buildSearchFilter([], '');
      expect(filter).toBe('');
    });
  });

  describe('Sanitization integration', () => {
    it('should sanitize search term automatically', () => {
      const filter = buildSearchFilter(['numero'], '50%');
      expect(filter).toBe('numero.ilike.%50\\%%');
    });

    it('should handle wildcards in multiple fields', () => {
      const filter = buildSearchFilter(['numero', 'nombre'], 'test_value');
      expect(filter).toBe('numero.ilike.%test\\_value%,nombre.ilike.%test\\_value%');
    });

    it('should prevent SQL injection via search filter', () => {
      const filter = buildSearchFilter(['nombre'], "'; DROP TABLE users;--");
      // Should not contain unescaped wildcards
      expect(filter).not.toMatch(/[^\\]%/);
      expect(filter).not.toMatch(/[^\\]_/);
    });
  });

  describe('PostgREST format', () => {
    it('should format correctly for PostgREST OR query', () => {
      const filter = buildSearchFilter(['email', 'name'], 'john');
      expect(filter).toBe('email.ilike.%john%,name.ilike.%john%');
      // Verify it's comma-separated (PostgREST OR format)
      expect(filter.split(',').length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle field names with underscores', () => {
      const filter = buildSearchFilter(['user_name', 'email_address'], 'test');
      expect(filter).toBe('user_name.ilike.%test%,email_address.ilike.%test%');
    });

    it('should handle special characters in search term', () => {
      const filter = buildSearchFilter(['numero'], '%_\\');
      expect(filter).toBe('numero.ilike.%\\%\\_\\\\%');
    });
  });
});

describe('isValidSearchTerm', () => {
  describe('Basic validation', () => {
    it('should accept valid search terms', () => {
      const validTerms = [
        'john',
        'john doe',
        '123-456-7890',
        'email@example.com',
        'test_value',
      ];

      validTerms.forEach((term) => {
        expect(isValidSearchTerm(term)).toBe(true);
      });
    });

    it('should reject empty strings', () => {
      expect(isValidSearchTerm('')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(isValidSearchTerm('   ')).toBe(false);
    });
  });

  describe('Length validation', () => {
    it('should respect default minLength (1)', () => {
      expect(isValidSearchTerm('a')).toBe(true);
      expect(isValidSearchTerm('')).toBe(false);
    });

    it('should respect custom minLength', () => {
      expect(isValidSearchTerm('ab', 3)).toBe(false);
      expect(isValidSearchTerm('abc', 3)).toBe(true);
      expect(isValidSearchTerm('abcd', 3)).toBe(true);
    });

    it('should respect default maxLength (100)', () => {
      const maxLengthString = 'a'.repeat(100);
      const tooLongString = 'a'.repeat(101);

      expect(isValidSearchTerm(maxLengthString)).toBe(true);
      expect(isValidSearchTerm(tooLongString)).toBe(false);
    });

    it('should respect custom maxLength', () => {
      const string10 = 'a'.repeat(10);
      const string11 = 'a'.repeat(11);

      expect(isValidSearchTerm(string10, 1, 10)).toBe(true);
      expect(isValidSearchTerm(string11, 1, 10)).toBe(false);
    });
  });

  describe('Trimming behavior', () => {
    it('should trim whitespace before validation', () => {
      expect(isValidSearchTerm('  test  ')).toBe(true);
      expect(isValidSearchTerm('  ab  ', 3)).toBe(false); // 'ab' is less than 3 after trim
      expect(isValidSearchTerm('  abc  ', 3)).toBe(true); // 'abc' is 3 after trim
    });

    it('should reject strings that are only whitespace after trim', () => {
      expect(isValidSearchTerm('     ')).toBe(false);
      expect(isValidSearchTerm('\t\n')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters', () => {
      expect(isValidSearchTerm('%_\\')).toBe(true);
      expect(isValidSearchTerm('test@#$%')).toBe(true);
    });

    it('should handle unicode characters', () => {
      expect(isValidSearchTerm('café')).toBe(true);
      expect(isValidSearchTerm('日本語')).toBe(true);
      expect(isValidSearchTerm('🚀')).toBe(true);
    });

    it('should handle very short minLength', () => {
      expect(isValidSearchTerm('', 0)).toBe(false); // Empty string always invalid
      expect(isValidSearchTerm('a', 0)).toBe(true);
    });

    it('should handle very large maxLength', () => {
      const veryLongString = 'a'.repeat(10000);
      expect(isValidSearchTerm(veryLongString, 1, 20000)).toBe(true);
      expect(isValidSearchTerm(veryLongString, 1, 5000)).toBe(false);
    });
  });

  describe('Security considerations', () => {
    it('should accept potential injection strings (validation is separate from sanitization)', () => {
      // isValidSearchTerm only checks length, not content
      // Sanitization happens in sanitizeSearchTerm
      expect(isValidSearchTerm("'; DROP TABLE users;--")).toBe(true);
      expect(isValidSearchTerm("' OR '1'='1")).toBe(true);
    });

    it('should enforce maxLength to prevent DoS via huge queries', () => {
      const hugeString = 'a'.repeat(10000);
      expect(isValidSearchTerm(hugeString, 1, 100)).toBe(false);
    });
  });
});
