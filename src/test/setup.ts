/**
 * @fileoverview Test Setup
 * @description Global test configuration and setup for Vitest
 */

import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Extend Vitest matchers with jest-dom
expect.extend({});
