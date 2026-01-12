/**
 * @fileoverview Contact Status Validation Schemas
 * @description Zod schemas for validating contact status data
 */

import { z } from 'zod';

/**
 * Schema for creating/editing contact status
 * - Name: 1-50 characters
 * - Color: Valid hex color (#RRGGBB)
 * - Icon: Optional Lucide icon name
 * - is_default: Optional boolean
 */
export const contactStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (ej: #3b82f6)')
    .transform(val => val.toUpperCase()), // Normalize to uppercase
  icon: z
    .string()
    .optional()
    .nullable()
    .transform(val => val || null), // Convert empty string to null
  is_default: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Schema for partial updates (all fields optional)
 */
export const updateContactStatusSchema = contactStatusSchema.partial();

/**
 * Predefined color palette for status selection
 * (Tailwind-inspired colors)
 */
export const STATUS_COLOR_PALETTE = [
  { label: 'Verde', value: '#22C55E' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Violeta', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Rojo', value: '#EF4444' },
  { label: 'Naranja', value: '#F97316' },
  { label: 'Amarillo', value: '#EAB308' },
  { label: 'Gris', value: '#64748B' },
  { label: 'Índigo', value: '#6366F1' },
  { label: 'Cyan', value: '#06B6D4' },
] as const;

/**
 * Common Lucide icons for statuses
 * (Suggested icons for quick selection)
 */
export const SUGGESTED_STATUS_ICONS = [
  'user-plus',
  'phone',
  'mail',
  'check-circle',
  'x-circle',
  'clock',
  'star',
  'heart',
  'flag',
  'tag',
  'user-check',
  'user-x',
  'alert-circle',
  'info',
] as const;
