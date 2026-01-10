/**
 * @fileoverview Tags Routes
 * @description HTTP routes for conversation tags (READ operations only for Phase 3)
 * Phase 4 will add mutation routes (POST, PATCH, DELETE)
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as conversationsService from '../services/conversations.service.ts';
import { createTagSchema, updateTagSchema } from '../utils/validation.ts';

export const tagsRoutes = new Hono();

/**
 * GET /api/tags
 * Get all conversation tags for the current tenant
 *
 * Response:
 * {
 *   data: ConversationTag[]
 * }
 */
tagsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const tags = await conversationsService.listTags(
    supabaseClient,
    userScope
  );

  return c.json({ data: tags });
});

// ============================================================================
// MUTATION ROUTES (Phase 4)
// ============================================================================

/**
 * POST /api/tags
 * Create a new conversation tag
 *
 * Request body:
 * {
 *   name: string (required)
 *   color?: string
 *   icon?: string
 * }
 *
 * Response: ConversationTag
 */
tagsRoutes.post(
  '/',
  zValidator('json', createTagSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const data = c.req.valid('json');

    const tag = await conversationsService.createTag(
      supabaseClient,
      userScope,
      data
    );

    return c.json(tag, 201);
  }
);

/**
 * PATCH /api/tags/:id
 * Update a conversation tag
 * Cannot update system tags
 *
 * Request body (all fields optional):
 * {
 *   name?: string
 *   color?: string
 *   icon?: string
 * }
 *
 * Response:
 * {
 *   success: true
 * }
 */
tagsRoutes.patch(
  '/:id',
  zValidator('json', updateTagSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    await conversationsService.updateTag(
      supabaseClient,
      userScope,
      id,
      updates
    );

    return c.json({ success: true });
  }
);

/**
 * DELETE /api/tags/:id
 * Delete a conversation tag
 * Cannot delete system tags
 *
 * Response:
 * {
 *   success: true
 * }
 */
tagsRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  await conversationsService.deleteTag(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});
