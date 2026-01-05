/**
 * @fileoverview Error Reporting Utilities
 * @description Centralized error reporting and logging
 */

import type { ErrorInfo } from 'react';

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Reports an error to the error monitoring service
 * In production, this should send to Sentry, LogRocket, or similar
 *
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function reportError(error: Error, context?: ErrorContext): void {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('Error reported:', error);
    if (context) {
      console.error('Error context:', context);
    }
  }

  // In production, send to error monitoring service
  if (import.meta.env.PROD) {
    try {
      // TODO: Integrate with error monitoring service
      // Example with Sentry:
      // Sentry.captureException(error, {
      //   user: { id: context?.userId },
      //   tags: {
      //     tenant_id: context?.tenantId,
      //     component: context?.component,
      //   },
      //   extra: context?.metadata,
      // });

      // For now, we'll just log structured data
      console.error('[Error Report]', {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    } catch (reportingError) {
      // Don't let error reporting crash the app
      console.error('Failed to report error:', reportingError);
    }
  }
}

/**
 * Reports a React component error from ErrorBoundary
 *
 * @param error - The error object
 * @param errorInfo - React error info with component stack
 * @param context - Additional context
 */
export function reportComponentError(
  error: Error,
  errorInfo: ErrorInfo,
  context?: ErrorContext
): void {
  reportError(error, {
    ...context,
    metadata: {
      ...context?.metadata,
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * Creates a promise rejection handler
 * Use this to catch unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      {
        action: 'unhandledPromiseRejection',
        metadata: {
          promise: event.promise,
        },
      }
    );
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      action: 'globalError',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
