/**
 * @fileoverview Route Registry
 * @description Central registry for all API routes
 */

import type { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { customFieldsRoutes } from './custom-fields.routes.ts';
import { contactsRoutes } from './contacts.routes.ts';
import { conversationsRoutes } from './conversations.routes.ts';
import { tagsRoutes } from './tags.routes.ts';
import { campaignsRoutes } from './campaigns.routes.ts';
import { integrationsRoutes } from './integrations.routes.ts';
import { adminRoutes } from './admin.routes.ts';
import { adminMiddleware } from '../middleware/auth.ts';

/**
 * Registers all feature routes to the main Hono app
 * Routes will be added here as features are migrated (Phase 1+)
 *
 * @param app - Main Hono application instance
 */
export function registerRoutes(app: Hono) {
  // Phase 1: Custom Fields routes (ACTIVE)
  app.route('/api/custom-fields', customFieldsRoutes);
  console.log('[routes] ✅ Custom Fields routes registered');

  // Phase 2: Contacts routes (ACTIVE)
  app.route('/api/contacts', contactsRoutes);
  console.log('[routes] ✅ Contacts routes registered');

  // Phase 3 & 4: Conversations routes - Queries + Mutations (ACTIVE)
  app.route('/api/conversations', conversationsRoutes);
  app.route('/api/tags', tagsRoutes);
  console.log('[routes] ✅ Conversations and Tags routes registered');

  // Phase 5: Campaigns routes (ACTIVE)
  app.route('/api/campaigns', campaignsRoutes);
  console.log('[routes] ✅ Campaigns routes registered');

  // Phase 6: Integrations routes (ACTIVE)
  app.route('/api/integrations', integrationsRoutes);
  console.log('[routes] ✅ Integrations routes registered');

  // Phase 7: Admin routes (ACTIVE - Super Admin only)
  // Apply admin middleware to all /api/admin/* routes
  app.use('/api/admin/*', adminMiddleware);
  app.route('/api/admin', adminRoutes);
  console.log('[routes] ✅ Admin routes registered (super admin only)');
}
