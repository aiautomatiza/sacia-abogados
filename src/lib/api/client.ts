/**
 * @fileoverview API Client
 * @description Centralized HTTP client for API Gateway communication
 */

import { supabase } from '@/integrations/supabase/client';

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL;

/**
 * API request options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Custom API error class with status code and error code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Makes an authenticated request to the API Gateway
 *
 * @param endpoint - API endpoint path (e.g., '/api/contacts')
 * @param options - Request options (method, body, params, headers)
 * @returns Parsed JSON response
 * @throws ApiError if request fails
 *
 * @example
 * const contacts = await apiRequest<Contact[]>('/api/contacts', {
 *   params: { search: 'john', page: '1' }
 * });
 *
 * @example
 * const contact = await apiRequest<Contact>('/api/contacts', {
 *   method: 'POST',
 *   body: { numero: '666123456', nombre: 'John Doe' }
 * });
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  // Get current session for auth token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError('Not authenticated', 401);
  }

  // Validate API Gateway URL is configured
  if (!API_GATEWAY_URL) {
    throw new ApiError('API Gateway URL not configured', 500);
  }

  // Build URL with query params
  const url = new URL(`${API_GATEWAY_URL}${endpoint}`);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  }

  try {
    // Make request
    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...(options.body && { body: JSON.stringify(options.body) }),
    });

    // Parse response
    const data = await response.json();

    // Handle error response
    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data.code
      );
    }

    return data;
  } catch (error) {
    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle fetch errors (network issues, etc.)
    if (error instanceof TypeError) {
      throw new ApiError(
        'Network error: Unable to reach API Gateway',
        0
      );
    }

    // Unknown error
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

/**
 * Checks if the API Gateway is healthy
 *
 * @returns Health check response
 * @example
 * const health = await healthCheck();
 * console.log(health.status); // 'ok'
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string; version: string; phase: string }> {
  if (!API_GATEWAY_URL) {
    throw new Error('API Gateway URL not configured');
  }

  const response = await fetch(`${API_GATEWAY_URL}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}
