/**
 * @fileoverview Appointments Service
 * @description Business logic for managing appointments
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { UserScope } from '../types/shared.types.ts';
import { ApiError } from '../types/shared.types.ts';
import { assertTenantAccess } from '../middleware/tenant-isolation.ts';
import { normalizeSpanishPhone } from '../utils/phone.ts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AppointmentType = 'call' | 'in_person';
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export interface Appointment {
  id: string;
  tenant_id: string;
  type: AppointmentType;
  contact_id: string;
  agent_id: string | null;
  location_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  status: AppointmentStatus;
  title: string | null;
  description: string | null;
  customer_notes: string | null;
  reminder_sent_at: string | null;
  confirmation_sent_at: string | null;
  call_phone_number: string | null;
  call_id: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_reason: string | null;
}

export interface AppointmentDetailed extends Appointment {
  contact_name: string | null;
  contact_phone: string;
  contact_attributes: Record<string, any>;
  agent_email: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_phone: string | null;
  call_state: string | null;
  call_duration: number | null;
  time_status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  scheduled_end_at: string;
}

export interface AppointmentFilters {
  search?: string;
  type?: AppointmentType;
  status?: AppointmentStatus[];
  agent_id?: string;
  location_id?: string;
  contact_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface CreateAppointmentInput {
  type: AppointmentType;
  contact_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  timezone?: string;
  agent_id?: string;
  location_id?: string;
  title?: string;
  description?: string;
  customer_notes?: string;
  call_phone_number?: string;
  metadata?: Record<string, any>;
  skip_availability_check?: boolean;
}

export type UpdateAppointmentInput = Partial<
  Omit<CreateAppointmentInput, 'type' | 'contact_id' | 'skip_availability_check'>
> & {
  status?: AppointmentStatus;
  cancelled_reason?: string;
};

export interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  in_progress: number;
  completion_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  calls_count: number;
  in_person_count: number;
  avg_duration_minutes: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verifies that the contact exists and belongs to the tenant
 */
async function verifyContactAccess(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  contactId: string
): Promise<void> {
  const { data, error } = await supabaseClient
    .from('crm_contacts')
    .select('id, tenant_id')
    .eq('id', contactId)
    .single();

  if (error || !data) {
    throw new ApiError('Contact not found', 404, 'CONTACT_NOT_FOUND');
  }

  assertTenantAccess(data.tenant_id, userScope, 'contact');
}

/**
 * Verifies that the agent exists
 */
async function verifyAgentExists(
  supabaseClient: SupabaseClient,
  agentId: string
): Promise<void> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('id', agentId)
    .single();

  if (error || !data) {
    throw new ApiError('Agent not found', 404, 'AGENT_NOT_FOUND');
  }
}

/**
 * Verifies that the location exists and belongs to the tenant
 */
async function verifyLocationAccess(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  locationId: string
): Promise<void> {
  const { data, error } = await supabaseClient
    .from('tenant_locations')
    .select('id, tenant_id, is_active')
    .eq('id', locationId)
    .single();

  if (error || !data) {
    throw new ApiError('Location not found', 404, 'LOCATION_NOT_FOUND');
  }

  assertTenantAccess(data.tenant_id, userScope, 'location');

  if (!data.is_active) {
    throw new ApiError('Location is not active', 400, 'LOCATION_INACTIVE');
  }
}

/**
 * Notifies external webhook about appointment changes
 */
async function notifyAppointmentWebhook(
  supabaseClient: SupabaseClient,
  tenantId: string,
  appointment: Appointment,
  action: 'created' | 'updated' | 'cancelled'
): Promise<void> {
  try {
    const { data: settings } = await supabaseClient
      .from('tenant_settings')
      .select('appointments_enabled, appointments_webhook_url')
      .eq('tenant_id', tenantId)
      .single();

    if (!settings?.appointments_enabled || !settings?.appointments_webhook_url) {
      return;
    }

    const webhookUrl = settings.appointments_webhook_url;

    console.log(`[appointments] Notifying webhook: ${action}`, webhookUrl);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: `appointment.${action}`,
        data: appointment,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('[appointments] Webhook notification failed:', error);
    // Don't fail the operation if webhook fails
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Gets paginated list of appointments for the user's tenant
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param filters - Search and filter options
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Appointments data and total count
 */
export async function getAppointments(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: AppointmentFilters = {},
  page: number = 1,
  pageSize: number = 30
): Promise<{ data: AppointmentDetailed[]; total: number }> {
  console.log('[appointments] Getting appointments for tenant:', userScope.tenantId);

  let query = supabaseClient
    .from('v_appointments_detailed')
    .select('*', { count: 'exact' });

  // Tenant filtering
  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  } else if (userScope.tenantId) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  // Apply filters
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id);
  }

  if (filters.location_id) {
    query = query.eq('location_id', filters.location_id);
  }

  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id);
  }

  if (filters.date_from) {
    query = query.gte('scheduled_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('scheduled_at', filters.date_to);
  }

  if (filters.search) {
    const searchTerm = filters.search.trim().replace(/[%_]/g, '\\$&');
    query = query.or(
      `contact_name.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`
    );
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('scheduled_at', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[appointments] Error fetching appointments:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return {
    data: (data || []) as AppointmentDetailed[],
    total: count || 0,
  };
}

/**
 * Gets a single appointment by ID
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Appointment ID
 * @returns Appointment data
 */
export async function getAppointment(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<AppointmentDetailed> {
  console.log('[appointments] Getting appointment:', id);

  let query = supabaseClient
    .from('v_appointments_detailed')
    .select('*')
    .eq('id', id);

  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('[appointments] Error fetching appointment:', error);
    if (error.code === 'PGRST116') {
      throw new ApiError('Appointment not found or access denied', 404, 'NOT_FOUND');
    }
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  assertTenantAccess(data.tenant_id, userScope, 'appointment');

  return data as AppointmentDetailed;
}

/**
 * Checks availability for an appointment slot
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param params - Availability check parameters
 * @returns Availability status
 */
export async function checkAvailability(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  params: {
    type: AppointmentType;
    scheduled_at: string;
    duration_minutes: number;
    agent_id?: string;
    location_id?: string;
    exclude_appointment_id?: string;
  }
): Promise<{ available: boolean }> {
  console.log('[appointments] Checking availability:', params);

  const { data, error } = await supabaseClient.rpc('check_appointment_availability', {
    p_tenant_id: userScope.tenantId,
    p_type: params.type,
    p_scheduled_at: params.scheduled_at,
    p_duration_minutes: params.duration_minutes,
    p_agent_id: params.agent_id || null,
    p_location_id: params.location_id || null,
    p_exclude_appointment_id: params.exclude_appointment_id || null,
  });

  if (error) {
    console.error('[appointments] Error checking availability:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  return { available: data === true };
}

/**
 * Creates a new appointment
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param input - Appointment data
 * @returns Created appointment
 */
export async function createAppointment(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  input: CreateAppointmentInput
): Promise<Appointment> {
  console.log('[appointments] Creating appointment for tenant:', userScope.tenantId);

  if (userScope.isSuperAdmin && !userScope.tenantId) {
    throw new ApiError('Super admins must specify a tenant to create appointments', 400);
  }

  // Verify contact exists and belongs to tenant
  await verifyContactAccess(supabaseClient, userScope, input.contact_id);

  // Verify agent/location based on type
  // Note: agent_id is optional for 'call' appointments (can be assigned later)
  if (input.type === 'call' && input.agent_id) {
    await verifyAgentExists(supabaseClient, input.agent_id);
  } else if (input.type === 'in_person') {
    if (!input.location_id) {
      throw new ApiError("Appointments of type 'in_person' require location_id", 400, 'VALIDATION_ERROR');
    }
    await verifyLocationAccess(supabaseClient, userScope, input.location_id);
  }

  // Check availability (unless skipped)
  if (!input.skip_availability_check) {
    const availability = await checkAvailability(supabaseClient, userScope, {
      type: input.type,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes || 30,
      agent_id: input.agent_id,
      location_id: input.location_id,
    });

    if (!availability.available) {
      throw new ApiError(
        'The selected time slot is not available',
        409,
        'SLOT_NOT_AVAILABLE'
      );
    }
  }

  // Normalize phone number if provided
  const callPhoneNumber = input.call_phone_number
    ? normalizeSpanishPhone(input.call_phone_number)
    : null;

  // Create the appointment
  const { data, error } = await supabaseClient
    .from('appointments')
    .insert({
      tenant_id: userScope.tenantId,
      type: input.type,
      contact_id: input.contact_id,
      agent_id: input.agent_id || null,
      location_id: input.location_id || null,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes || 30,
      timezone: input.timezone || 'Europe/Madrid',
      status: 'scheduled',
      title: input.title || null,
      description: input.description || null,
      customer_notes: input.customer_notes || null,
      call_phone_number: callPhoneNumber,
      metadata: input.metadata || {},
      created_by: userScope.userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[appointments] Error creating appointment:', error);

    if (error.code === '23503') {
      throw new ApiError('Referenced resource not found', 400, 'FOREIGN_KEY_VIOLATION');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  const appointment = data as Appointment;

  // Notify webhook (fire and forget)
  notifyAppointmentWebhook(supabaseClient, userScope.tenantId, appointment, 'created').catch(
    (err) => console.error('[appointments] Background webhook notification failed:', err)
  );

  return appointment;
}

/**
 * Updates an existing appointment
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Appointment ID
 * @param updates - Partial appointment updates
 * @returns Updated appointment
 */
export async function updateAppointment(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string,
  updates: UpdateAppointmentInput
): Promise<Appointment> {
  console.log('[appointments] Updating appointment:', id);

  // Get existing appointment to validate
  const existing = await getAppointment(supabaseClient, userScope, id);

  // Build update data
  const updateData: Record<string, any> = {};

  if (updates.scheduled_at !== undefined) {
    updateData.scheduled_at = updates.scheduled_at;
  }

  if (updates.duration_minutes !== undefined) {
    updateData.duration_minutes = updates.duration_minutes;
  }

  if (updates.timezone !== undefined) {
    updateData.timezone = updates.timezone;
  }

  if (updates.status !== undefined) {
    updateData.status = updates.status;

    // If cancelling, set cancelled_at
    if (updates.status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      if (updates.cancelled_reason) {
        updateData.cancelled_reason = updates.cancelled_reason;
      }
    }
  }

  if (updates.agent_id !== undefined) {
    if (existing.type === 'call' && updates.agent_id) {
      await verifyAgentExists(supabaseClient, updates.agent_id);
    }
    updateData.agent_id = updates.agent_id;
  }

  if (updates.location_id !== undefined) {
    if (existing.type === 'in_person' && updates.location_id) {
      await verifyLocationAccess(supabaseClient, userScope, updates.location_id);
    }
    updateData.location_id = updates.location_id;
  }

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.customer_notes !== undefined) updateData.customer_notes = updates.customer_notes;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  if (updates.call_phone_number !== undefined) {
    updateData.call_phone_number = updates.call_phone_number
      ? normalizeSpanishPhone(updates.call_phone_number)
      : null;
  }

  // Check availability if time changed (and not cancelling)
  if ((updates.scheduled_at || updates.duration_minutes) && updates.status !== 'cancelled') {
    const availability = await checkAvailability(supabaseClient, userScope, {
      type: existing.type,
      scheduled_at: updates.scheduled_at || existing.scheduled_at,
      duration_minutes: updates.duration_minutes || existing.duration_minutes,
      agent_id: updates.agent_id ?? existing.agent_id ?? undefined,
      location_id: updates.location_id ?? existing.location_id ?? undefined,
      exclude_appointment_id: id,
    });

    if (!availability.available) {
      throw new ApiError(
        'The selected time slot is not available',
        409,
        'SLOT_NOT_AVAILABLE'
      );
    }
  }

  // Execute update
  let query = supabaseClient
    .from('appointments')
    .update(updateData)
    .eq('id', id);

  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { data, error } = await query.select().single();

  if (error) {
    console.error('[appointments] Error updating appointment:', error);

    if (error.code === 'PGRST116') {
      throw new ApiError('Appointment not found or access denied', 404, 'NOT_FOUND');
    }

    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  const appointment = data as Appointment;

  // Notify webhook
  const action = updates.status === 'cancelled' ? 'cancelled' : 'updated';
  notifyAppointmentWebhook(supabaseClient, userScope.tenantId, appointment, action).catch(
    (err) => console.error('[appointments] Background webhook notification failed:', err)
  );

  return appointment;
}

/**
 * Deletes an appointment (hard delete)
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param id - Appointment ID
 */
export async function deleteAppointment(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  id: string
): Promise<void> {
  console.log('[appointments] Deleting appointment:', id);

  let query = supabaseClient
    .from('appointments')
    .delete()
    .eq('id', id);

  if (!userScope.isSuperAdmin) {
    query = query.eq('tenant_id', userScope.tenantId);
  }

  const { error } = await query;

  if (error) {
    console.error('[appointments] Error deleting appointment:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Gets appointment statistics
 *
 * @param supabaseClient - Supabase client with user context
 * @param userScope - Current user scope
 * @param filters - Filter options for stats
 * @returns Appointment statistics
 */
export async function getAppointmentStats(
  supabaseClient: SupabaseClient,
  userScope: UserScope,
  filters: {
    date_from?: string;
    date_to?: string;
    type?: AppointmentType;
    location_id?: string;
    agent_id?: string;
  } = {}
): Promise<AppointmentStats> {
  console.log('[appointments] Getting stats for tenant:', userScope.tenantId);

  const { data, error } = await supabaseClient.rpc('calculate_appointments_stats', {
    p_tenant_id: userScope.tenantId,
    p_date_from: filters.date_from || null,
    p_date_to: filters.date_to || null,
    p_type: filters.type || null,
    p_location_id: filters.location_id || null,
    p_agent_id: filters.agent_id || null,
  });

  if (error) {
    console.error('[appointments] Error getting stats:', error);
    throw new ApiError(error.message, 500, 'DATABASE_ERROR');
  }

  // The RPC returns an array with one row
  const stats = Array.isArray(data) ? data[0] : data;

  return {
    total: Number(stats?.total || 0),
    scheduled: Number(stats?.scheduled || 0),
    confirmed: Number(stats?.confirmed || 0),
    completed: Number(stats?.completed || 0),
    cancelled: Number(stats?.cancelled || 0),
    no_show: Number(stats?.no_show || 0),
    in_progress: Number(stats?.in_progress || 0),
    completion_rate: Number(stats?.completion_rate || 0),
    cancellation_rate: Number(stats?.cancellation_rate || 0),
    no_show_rate: Number(stats?.no_show_rate || 0),
    calls_count: Number(stats?.calls_count || 0),
    in_person_count: Number(stats?.in_person_count || 0),
    avg_duration_minutes: Number(stats?.avg_duration_minutes || 0),
  };
}
