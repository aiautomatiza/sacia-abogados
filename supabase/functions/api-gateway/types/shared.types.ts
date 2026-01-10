/**
 * @fileoverview Shared Types for API Gateway
 * @description Common types used across the API Gateway
 */

/**
 * User scope containing authentication and tenant context
 * Used for all operations requiring user context
 */
export interface UserScope {
  userId: string;
  tenantId: string;
  isSuperAdmin: boolean;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  timestamp: string;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
