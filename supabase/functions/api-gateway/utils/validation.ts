/**
 * @fileoverview Validation Schemas
 * @description Zod schemas for request validation across the API Gateway
 */

import { z } from 'https://esm.sh/zod@3.22.4';

/**
 * Custom Field Types enum
 */
const customFieldTypeSchema = z.enum([
  'text',
  'number',
  'email',
  'phone',
  'select',
  'date',
  'textarea',
  'checkbox',
  'url'
]);

/**
 * Create Custom Field schema
 * Validates input for creating a new custom field
 */
export const createCustomFieldSchema = z.object({
  field_name: z.string()
    .min(1, 'Field name is required')
    .max(100, 'Field name too long')
    .regex(/^[a-z0-9_]+$/, 'Field name must be lowercase alphanumeric with underscores only'),
  field_label: z.string()
    .min(1, 'Field label is required')
    .max(200, 'Field label too long'),
  field_type: customFieldTypeSchema,
  options: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
});

/**
 * Update Custom Field schema
 * Partial update - all fields are optional
 */
export const updateCustomFieldSchema = z.object({
  field_name: z.string()
    .min(1, 'Field name is required')
    .max(100, 'Field name too long')
    .regex(/^[a-z0-9_]+$/, 'Field name must be lowercase alphanumeric with underscores only')
    .optional(),
  field_label: z.string()
    .min(1, 'Field label is required')
    .max(200, 'Field label too long')
    .optional(),
  field_type: customFieldTypeSchema.optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

/**
 * Reorder Fields schema
 * Validates array of { id, display_order } for bulk reordering
 */
export const reorderFieldsSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string().uuid('Invalid field ID'),
      display_order: z.number().int().min(0, 'Display order must be non-negative'),
    })
  ).min(1, 'At least one field is required'),
});

/**
 * UUID parameter schema
 * For validating ID path parameters
 */
export const uuidParamSchema = z.string().uuid('Invalid ID format');

// ============================================================================
// CONTACTS VALIDATION SCHEMAS
// ============================================================================

/**
 * Create Contact schema
 * Validates input for creating a new contact
 */
export const createContactSchema = z.object({
  numero: z.string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number too long'),
  nombre: z.string()
    .max(200, 'Name too long')
    .optional(),
  attributes: z.record(z.any()).optional(),
  skip_external_sync: z.boolean().optional(),
  status_id: z.string().uuid('Invalid status ID').nullable().optional(),
});

/**
 * Update Contact schema
 * Partial update - all fields are optional
 */
export const updateContactSchema = z.object({
  numero: z.string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number too long')
    .optional(),
  nombre: z.string()
    .max(200, 'Name too long')
    .optional(),
  attributes: z.record(z.any()).optional(),
  status_id: z.string().uuid('Invalid status ID').nullable().optional(),
});

/**
 * Bulk Delete schema
 * Validates array of contact IDs for bulk deletion
 */
export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid('Invalid contact ID'))
    .min(1, 'At least one contact ID is required')
    .max(100, 'Cannot delete more than 100 contacts at once'),
});

// ============================================================================
// CONTACT STATUSES VALIDATION SCHEMAS
// ============================================================================

/**
 * Create Contact Status schema
 * Validates input for creating a new contact status
 */
export const createContactStatusSchema = z.object({
  name: z.string()
    .min(1, 'Status name is required')
    .max(50, 'Status name too long')
    .trim(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)'),
  icon: z.string()
    .max(50, 'Icon name too long')
    .nullable()
    .optional(),
  is_default: z.boolean().optional().default(false),
});

/**
 * Update Contact Status schema
 * Partial update - all fields are optional
 */
export const updateContactStatusSchema = z.object({
  name: z.string()
    .min(1, 'Status name is required')
    .max(50, 'Status name too long')
    .trim()
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional(),
  icon: z.string()
    .max(50, 'Icon name too long')
    .nullable()
    .optional(),
  is_default: z.boolean().optional(),
});

/**
 * Reorder Contact Statuses schema
 * Validates array of { id, display_order } for bulk reordering
 */
export const reorderContactStatusesSchema = z.object({
  statuses: z.array(
    z.object({
      id: z.string().uuid('Invalid status ID'),
      display_order: z.number().int().min(0, 'Display order must be non-negative'),
    })
  ).min(1, 'At least one status is required'),
});

/**
 * Update Contact Status Assignment schema
 * Validates status assignment for a contact
 */
export const updateContactStatusAssignmentSchema = z.object({
  status_id: z.string().uuid('Invalid status ID').nullable(),
});

// ============================================================================
// CONVERSATIONS VALIDATION SCHEMAS (Phase 4 - Mutations)
// ============================================================================

/**
 * Conversation status enum
 */
const conversationStatusSchema = z.enum(['active', 'archived', 'pending', 'closed']);

/**
 * Update Conversation schema
 * Validates updates to conversation (status, tags, assigned_to)
 * All fields are optional
 */
export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  assigned_to: z.string().uuid('Invalid user ID').nullable().optional(),
});

// ============================================================================
// TAGS VALIDATION SCHEMAS (Phase 4 - Mutations)
// ============================================================================

/**
 * Create Tag schema
 * Validates input for creating a new conversation tag
 */
export const createTagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name too long'),
  color: z.string()
    .max(20, 'Color value too long')
    .optional(),
  icon: z.string()
    .max(50, 'Icon value too long')
    .optional(),
});

/**
 * Update Tag schema
 * Partial update - all fields are optional
 */
export const updateTagSchema = z.object({
  name: z.string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name too long')
    .optional(),
  color: z.string()
    .max(20, 'Color value too long')
    .optional(),
  icon: z.string()
    .max(50, 'Icon value too long')
    .optional(),
});

// ============================================================================
// INTEGRATIONS VALIDATION SCHEMAS (Phase 6)
// ============================================================================

/**
 * Sync frequency enum
 */
const syncFrequencySchema = z.enum(['manual', 'hourly', 'daily']);

/**
 * Update Sync Settings schema
 * Partial update - all fields are optional
 */
export const updateSyncSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  sync_frequency: syncFrequencySchema.optional(),
  field_mappings: z.record(z.string()).optional(),
});

// ============================================================================
// ADMIN VALIDATION SCHEMAS (Phase 7)
// ============================================================================

/**
 * Tenant status enum
 */
const tenantStatusSchema = z.enum(['active', 'inactive', 'suspended']);

/**
 * Create Tenant schema
 */
export const createTenantSchema = z.object({
  name: z.string()
    .min(1, 'Tenant name is required')
    .max(200, 'Tenant name too long'),
  company_name: z.string().max(200, 'Company name too long').optional(),
  contact_email: z.string().email('Invalid email').optional(),
  contact_phone: z.string().max(50, 'Phone number too long').optional(),
  status: tenantStatusSchema.optional(),
});

/**
 * Update Tenant Settings schema
 * Partial update - all fields are optional
 */
export const updateTenantSettingsSchema = z.object({
  whatsapp_enabled: z.boolean().optional(),
  whatsapp_webhook_url: z.string().nullable().optional(),
  calls_enabled: z.boolean().optional(),
  calls_webhook_url: z.string().nullable().optional(),
  calls_phone_number: z.string().nullable().optional(),
  conversations_enabled: z.boolean().optional(),
  conversations_webhook_url: z.string().nullable().optional(),
  credentials: z.object({
    whatsapp: z.record(z.any()).optional(),
    calls: z.record(z.any()).optional(),
    conversations: z.record(z.any()).optional(),
  }).optional(),
});

/**
 * Assign User to Tenant schema
 */
export const assignUserToTenantSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
});
