/**
 * @fileoverview Appointments Routes
 * @description HTTP routes for managing appointments
 */

import { Hono } from 'https://deno.land/x/hono@v3.12.8/mod.ts';
import { zValidator } from 'https://esm.sh/@hono/zod-validator@0.2.1';
import type { UserScope } from '../types/shared.types.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as appointmentsService from '../services/appointments.service.ts';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  checkAvailabilitySchema,
  uuidParamSchema,
} from '../utils/validation.ts';

export const appointmentsRoutes = new Hono();

/**
 * GET /api/appointments
 * Get paginated list of appointments for the current tenant
 *
 * Query params:
 * - search: string - Search by contact name/phone or title
 * - type: 'call' | 'in_person'
 * - status: string - Comma-separated status values
 * - agent_id: UUID
 * - location_id: UUID
 * - contact_id: UUID
 * - date_from: ISO datetime
 * - date_to: ISO datetime
 * - page: number (default: 1)
 * - pageSize: number (default: 30)
 *
 * Response:
 * {
 *   data: AppointmentDetailed[],
 *   meta: { page, pageSize, total, totalPages }
 * }
 */
appointmentsRoutes.get('/', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const search = c.req.query('search') || undefined;
  const type = c.req.query('type') as appointmentsService.AppointmentType | undefined;
  const statusParam = c.req.query('status') || '';
  const agent_id = c.req.query('agent_id') || undefined;
  const location_id = c.req.query('location_id') || undefined;
  const contact_id = c.req.query('contact_id') || undefined;
  const date_from = c.req.query('date_from') || undefined;
  const date_to = c.req.query('date_to') || undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '30');

  // Parse status from comma-separated string
  const status = statusParam
    ? (statusParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0) as appointmentsService.AppointmentStatus[])
    : undefined;

  const result = await appointmentsService.getAppointments(
    supabaseClient,
    userScope,
    { search, type, status, agent_id, location_id, contact_id, date_from, date_to },
    page,
    pageSize
  );

  return c.json({
    data: result.data,
    meta: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
});

/**
 * GET /api/appointments/stats
 * Get appointment statistics
 *
 * Query params:
 * - date_from: ISO datetime
 * - date_to: ISO datetime
 * - type: 'call' | 'in_person'
 * - location_id: UUID
 * - agent_id: UUID
 *
 * Response: AppointmentStats object
 */
appointmentsRoutes.get('/stats', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;

  const date_from = c.req.query('date_from') || undefined;
  const date_to = c.req.query('date_to') || undefined;
  const type = c.req.query('type') as appointmentsService.AppointmentType | undefined;
  const location_id = c.req.query('location_id') || undefined;
  const agent_id = c.req.query('agent_id') || undefined;

  const stats = await appointmentsService.getAppointmentStats(supabaseClient, userScope, {
    date_from,
    date_to,
    type,
    location_id,
    agent_id,
  });

  return c.json(stats);
});

/**
 * POST /api/appointments/check-availability
 * Check if a time slot is available
 *
 * Request body:
 * {
 *   type: 'call' | 'in_person',
 *   scheduled_at: ISO datetime,
 *   duration_minutes: number,
 *   agent_id?: UUID (optional for type='call'),
 *   location_id?: UUID (required for type='in_person'),
 *   exclude_appointment_id?: UUID (for updates)
 * }
 *
 * Response: { available: boolean }
 */
appointmentsRoutes.post('/check-availability', zValidator('json', checkAvailabilitySchema), async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const data = c.req.valid('json');

  const result = await appointmentsService.checkAvailability(supabaseClient, userScope, data);

  return c.json(result);
});

/**
 * GET /api/appointments/:id
 * Get a single appointment by ID
 *
 * Response: AppointmentDetailed object
 */
appointmentsRoutes.get('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json({ error: 'Invalid ID format', details: validationResult.error.issues }, 400);
  }

  const appointment = await appointmentsService.getAppointment(supabaseClient, userScope, id);

  return c.json(appointment);
});

/**
 * POST /api/appointments
 * Create a new appointment
 *
 * Request body:
 * {
 *   type: 'call' | 'in_person' (required),
 *   contact_id: UUID (required),
 *   scheduled_at: ISO datetime (required),
 *   duration_minutes?: number (default: 30),
 *   timezone?: string (default: 'Europe/Madrid'),
 *   agent_id?: UUID (optional for type='call'),
 *   location_id?: UUID (required for type='in_person'),
 *   title?: string,
 *   description?: string,
 *   customer_notes?: string,
 *   call_phone_number?: string,
 *   metadata?: object,
 *   skip_availability_check?: boolean (default: false)
 * }
 *
 * Response: Appointment object (201 Created)
 */
appointmentsRoutes.post('/', zValidator('json', createAppointmentSchema), async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const data = c.req.valid('json');

  const appointment = await appointmentsService.createAppointment(supabaseClient, userScope, data);

  return c.json(appointment, 201);
});

/**
 * PATCH /api/appointments/:id
 * Update an existing appointment
 *
 * Request body (all fields optional):
 * {
 *   scheduled_at?: ISO datetime,
 *   duration_minutes?: number,
 *   timezone?: string,
 *   status?: AppointmentStatus,
 *   agent_id?: UUID | null,
 *   location_id?: UUID | null,
 *   title?: string | null,
 *   description?: string | null,
 *   customer_notes?: string | null,
 *   call_phone_number?: string | null,
 *   metadata?: object,
 *   cancelled_reason?: string
 * }
 *
 * Response: Appointment object
 */
appointmentsRoutes.patch('/:id', zValidator('json', updateAppointmentSchema), async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');
  const updates = c.req.valid('json');

  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json({ error: 'Invalid ID format', details: validationResult.error.issues }, 400);
  }

  const appointment = await appointmentsService.updateAppointment(supabaseClient, userScope, id, updates);

  return c.json(appointment);
});

/**
 * DELETE /api/appointments/:id
 * Delete an appointment (hard delete)
 *
 * Response: { success: true }
 */
appointmentsRoutes.delete('/:id', async (c) => {
  const userScope = c.get('userScope') as UserScope;
  const supabaseClient = c.get('supabaseClient') as SupabaseClient;
  const id = c.req.param('id');

  const validationResult = uuidParamSchema.safeParse(id);
  if (!validationResult.success) {
    return c.json({ error: 'Invalid ID format', details: validationResult.error.issues }, 400);
  }

  await appointmentsService.deleteAppointment(supabaseClient, userScope, id);

  return c.json({ success: true });
});
