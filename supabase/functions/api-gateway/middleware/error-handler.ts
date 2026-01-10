/**
 * @fileoverview Error Handler Middleware
 * @description Centralized error handling for the API Gateway
 */

import type { Context, Next } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { ApiError } from '../types/shared.types.ts';

/**
 * Global error handler middleware
 * Catches all errors thrown in route handlers and returns standardized error responses
 *
 * @param c - Hono context
 * @param next - Next middleware
 * @returns Standardized error response
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // Log error with context
    console.error('[API ERROR]', {
      path: c.req.path,
      method: c.req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle ApiError with custom status and code
    if (error instanceof ApiError) {
      return c.json({
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      }, error.status);
    }

    // Handle generic Error
    if (error instanceof Error) {
      // Check for specific error patterns

      // PostgreSQL duplicate key error
      if (error.message.includes('23505') || error.message.includes('duplicate key')) {
        return c.json({
          error: 'Resource already exists',
          code: 'DUPLICATE_ERROR',
          timestamp: new Date().toISOString(),
        }, 409);
      }

      // PostgreSQL foreign key violation
      if (error.message.includes('23503')) {
        return c.json({
          error: 'Referenced resource not found',
          code: 'FOREIGN_KEY_VIOLATION',
          timestamp: new Date().toISOString(),
        }, 400);
      }

      // Access denied errors
      if (error.message.includes('Access denied') || error.message.includes('does not belong')) {
        return c.json({
          error: error.message,
          code: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        }, 403);
      }

      // Not found errors
      if (error.message.includes('not found')) {
        return c.json({
          error: error.message,
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        }, 404);
      }

      // Generic error
      return c.json({
        error: error.message,
        timestamp: new Date().toISOString(),
      }, 500);
    }

    // Unknown error type
    return c.json({
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    }, 500);
  }
}
