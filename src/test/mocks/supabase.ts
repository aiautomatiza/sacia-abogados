/**
 * @fileoverview Supabase Mocks
 * @description Mock implementations for Supabase client in tests
 */

import { vi } from 'vitest';

// Mock data types
export interface MockSupabaseResponse<T> {
  data: T | null;
  error: any | null;
  count?: number | null;
}

// Mock query builder
export class MockQueryBuilder {
  private mockData: any = null;
  private mockError: any = null;
  private mockCount: number | null = null;

  select(columns?: string, options?: any) {
    return this;
  }

  insert(data: any) {
    return this;
  }

  update(data: any) {
    return this;
  }

  delete() {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  in(column: string, values: any[]) {
    return this;
  }

  is(column: string, value: any) {
    return this;
  }

  gt(column: string, value: any) {
    return this;
  }

  or(query: string) {
    return this;
  }

  contains(column: string, value: any) {
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  range(from: number, to: number) {
    return this;
  }

  single() {
    return this;
  }

  maybeSingle() {
    return this;
  }

  // Set mock response for testing
  mockResolvedValue(response: MockSupabaseResponse<any>) {
    this.mockData = response.data;
    this.mockError = response.error;
    this.mockCount = response.count ?? null;
    return this;
  }

  // Execute query (returns promise)
  async then(resolve: any, reject?: any) {
    const response = {
      data: this.mockData,
      error: this.mockError,
      count: this.mockCount,
    };

    if (this.mockError && reject) {
      return reject(this.mockError);
    }

    return resolve(response);
  }
}

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  from: vi.fn((table: string) => new MockQueryBuilder()),
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
  removeChannel: vi.fn(),
});

// Export type
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
