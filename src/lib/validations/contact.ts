/**
 * @fileoverview Contact Validation Schemas
 * @description Zod schemas for runtime validation of contact operations
 */

import { z } from 'zod';

/**
 * Schema for creating a new contact
 * Enforces required fields and validates phone number format
 * Uses passthrough() to allow custom fields from dynamic form
 */
export const createContactSchema = z.object({
  numero: z
    .string()
    .min(1, 'Phone number is required')
    .max(50, 'Phone number too long')
    .trim(),
  nombre: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name too long')
    .trim(),
  attributes: z
    .record(z.unknown())
    .optional()
    .default({}),
  status_id: z
    .string()
    .uuid('Invalid status ID')
    .nullable()
    .optional(),
}).passthrough(); // Allow custom fields to pass through

/**
 * Schema for updating an existing contact
 * All fields are optional for partial updates
 * Uses passthrough() to allow custom fields from dynamic form
 */
export const updateContactSchema = z.object({
  numero: z
    .string()
    .min(1, 'Phone number cannot be empty')
    .max(50, 'Phone number too long')
    .trim()
    .optional(),
  nombre: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(200, 'Name too long')
    .trim()
    .optional(),
  attributes: z
    .record(z.unknown())
    .optional(),
  status_id: z
    .string()
    .uuid('Invalid status ID')
    .nullable()
    .optional(),
}).passthrough() // Allow custom fields to pass through
.refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Schema for contact filters
 */
export const contactFiltersSchema = z.object({
  search: z
    .string()
    .max(100, 'Search term too long')
    .optional(),
});

/**
 * Schema for bulk delete operation
 */
export const bulkDeleteContactsSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid contact ID'))
    .min(1, 'At least one contact ID required')
    .max(100, 'Cannot delete more than 100 contacts at once'),
});

// Type exports for TypeScript
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactFilters = z.infer<typeof contactFiltersSchema>;
export type BulkDeleteContactsInput = z.infer<typeof bulkDeleteContactsSchema>;
