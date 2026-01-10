/**
 * @fileoverview Custom Fields Routes
 * @description HTTP routes for managing custom fields
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as customFieldsService from '../services/custom-fields.service.ts';
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
  reorderFieldsSchema,
  uuidParamSchema,
} from '../utils/validation.ts';

export const customFieldsRoutes = new Hono();

/**
 * GET /api/custom-fields
 * Get all custom fields for the current tenant
 * Ordered by display_order
 */
customFieldsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const fields = await customFieldsService.getCustomFields(
    supabaseClient,
    userScope
  );

  return c.json({ data: fields });
});

/**
 * POST /api/custom-fields
 * Create a new custom field
 *
 * Request body:
 * {
 *   field_name: string (lowercase, alphanumeric + underscore)
 *   field_label: string
 *   field_type: 'text' | 'number' | 'email' | ...
 *   options?: string[]
 *   required?: boolean
 *   display_order?: number
 * }
 */
customFieldsRoutes.post(
  '/',
  zValidator('json', createCustomFieldSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const data = c.req.valid('json');

    const field = await customFieldsService.createCustomField(
      supabaseClient,
      userScope,
      data
    );

    return c.json(field, 201);
  }
);

/**
 * PATCH /api/custom-fields/:id
 * Update an existing custom field
 *
 * Request body (all fields optional):
 * {
 *   field_name?: string
 *   field_label?: string
 *   field_type?: string
 *   options?: string[]
 *   required?: boolean
 *   display_order?: number
 * }
 */
customFieldsRoutes.patch(
  '/:id',
  zValidator('json', updateCustomFieldSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    // Validate UUID format
    const validationResult = uuidParamSchema.safeParse(id);
    if (!validationResult.success) {
      return c.json(
        { error: 'Invalid ID format', details: validationResult.error.issues },
        400
      );
    }

    const field = await customFieldsService.updateCustomField(
      supabaseClient,
      userScope,
      id,
      updates
    );

    return c.json(field);
  }
);

/**
 * DELETE /api/custom-fields/:id
 * Delete a custom field
 */
customFieldsRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  // Validate UUID format
  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json(
      { error: 'Invalid ID format', details: validationResult.error.issues },
      400
    );
  }

  await customFieldsService.deleteCustomField(
    supabaseClient,
    userScope,
    id
  );

  return c.json({ success: true });
});

/**
 * POST /api/custom-fields/reorder
 * Reorder multiple custom fields in bulk
 *
 * Request body:
 * {
 *   fields: [
 *     { id: 'uuid', display_order: 0 },
 *     { id: 'uuid', display_order: 1 },
 *     ...
 *   ]
 * }
 */
customFieldsRoutes.post(
  '/reorder',
  zValidator('json', reorderFieldsSchema),
  async (c) => {
    const userScope = c.get('userScope') as UserScope;
    const supabaseClient = c.get('supabaseClient') as SupabaseClient;
    const { fields } = c.req.valid('json');

    await customFieldsService.reorderFields(
      supabaseClient,
      userScope,
      fields
    );

    return c.json({ success: true });
  }
);
