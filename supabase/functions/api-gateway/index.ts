/**
 * @fileoverview API Gateway Entry Point
 * @description Central API Gateway for the CRM multi-tenant system
 *
 * This Edge Function serves as the main API Gateway using Hono framework.
 * It provides a RESTful API with:
 * - JWT authentication via Supabase
 * - Tenant isolation (multi-tenancy)
 * - Centralized error handling
 * - Structured logging
 *
 * Architecture:
 * Frontend (React) → API Gateway (Hono) → Services → Supabase DB
 *
 * Realtime subscriptions remain direct: Frontend ↔ Supabase
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { cors } from 'https://deno.land/x/hono@v3.12.8/middleware.ts';
import { logger } from 'https://deno.land/x/hono@v3.12.8/middleware.ts';

import { authMiddleware } from './middleware/auth.ts';
import { tenantIsolationMiddleware } from './middleware/tenant-isolation.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { registerRoutes } from './routes/index.ts';

// Initialize Hono app with basePath for Supabase Edge Functions
// Supabase serves this at /functions/v1/api-gateway/*
// So we need to handle both /api-gateway/* and /* paths
const app = new Hono().basePath('/api-gateway');

// Global middleware (applies to all routes)
app.use('*', cors({
  origin: '*', // TODO: Configure allowed origins in production
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'x-client-info', 'apikey'],
  credentials: true,
}));
app.use('*', logger());
app.use('*', errorHandler);

// Health check endpoint (no authentication required)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    phase: 'Phase 0 - API Gateway Setup'
  });
});

// Protected routes (require authentication and tenant validation)
app.use('/api/*', authMiddleware);
app.use('/api/*', tenantIsolationMiddleware);

// Register feature routes
registerRoutes(app);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Endpoint not found',
    path: c.req.path,
    timestamp: new Date().toISOString()
  }, 404);
});

// Start server
console.log('[api-gateway] Starting API Gateway...');
console.log('[api-gateway] Environment:', {
  hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
  hasSupabaseAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
  hasSupabaseServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
});

Deno.serve(app.fetch);
