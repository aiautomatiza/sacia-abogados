/**
 * @fileoverview External Appointments API
 * @description Edge Function for external systems to manage appointments
 *
 * Authentication:
 * - Requires Authorization header: Bearer <EXTERNAL_API_SERVICE_ROLE_KEY>
 *
 * Endpoints:
 * - POST /functions/v1/external-appointments-api/create - Create a new appointment
 * - POST /functions/v1/external-appointments-api/update-status - Update appointment status
 * - POST /functions/v1/external-appointments-api/lookup - Find appointment by criteria
 * - POST /functions/v1/external-appointments-api/cancel - Cancel an appointment
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types
// ============================================================================

type AppointmentType = 'call' | 'in_person';
type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

interface CreateAppointmentRequest {
  tenant_id: string;
  type: AppointmentType;
  contact_id?: string;
  contact_phone?: string; // Alternative to contact_id - will lookup contact
  scheduled_at: string; // ISO 8601 datetime
  duration_minutes?: number;
  timezone?: string;
  agent_id?: string; // Required for type='call'
  location_id?: string; // Required for type='in_person'
  title?: string;
  description?: string;
  customer_notes?: string;
  call_phone_number?: string;
  metadata?: Record<string, any>;
  skip_availability_check?: boolean;
}

interface UpdateStatusRequest {
  tenant_id: string;
  appointment_id: string;
  status: AppointmentStatus;
  cancelled_reason?: string; // Only for status='cancelled'
}

interface LookupRequest {
  tenant_id: string;
  appointment_id?: string;
  contact_id?: string;
  contact_phone?: string;
  date_from?: string;
  date_to?: string;
  status?: AppointmentStatus[];
  type?: AppointmentType;
  limit?: number;
}

interface CancelRequest {
  tenant_id: string;
  appointment_id: string;
  reason?: string;
}

interface AppointmentResult {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduled_at: string;
  duration_minutes: number;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string;
  agent_id: string | null;
  location_id: string | null;
  location_name: string | null;
  title: string | null;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Normalizes a Spanish phone number to E.164 format
 */
function normalizeSpanishPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+34')) {
    return cleaned;
  }

  if (cleaned.startsWith('0034')) {
    return '+34' + cleaned.slice(4);
  }

  if (cleaned.startsWith('34') && cleaned.length === 11) {
    const withoutPrefix = cleaned.slice(2);
    if (/^[6789]\d{8}$/.test(withoutPrefix)) {
      return '+34' + withoutPrefix;
    }
  }

  if (/^[6789]\d{8}$/.test(cleaned)) {
    return '+34' + cleaned;
  }

  return cleaned.startsWith('+') ? cleaned : cleaned;
}

/**
 * Creates a JSON error response
 */
function errorResponse(message: string, status: number, code?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code || 'ERROR',
      timestamp: new Date().toISOString(),
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Creates a JSON success response
 */
function successResponse(data: Record<string, any>, status: number = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
      timestamp: new Date().toISOString(),
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Validates that required fields are present
 */
function validateRequired(payload: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Looks up a contact by phone number
 */
async function lookupContactByPhone(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string
): Promise<{ id: string; nombre: string | null; numero: string } | null> {
  const normalizedPhone = normalizeSpanishPhone(phone);
  const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;

  const { data, error } = await supabase
    .from('crm_contacts')
    .select('id, nombre, numero')
    .eq('tenant_id', tenantId)
    .or(`numero.eq.${normalizedPhone},numero.eq.${phoneWithoutPlus}`)
    .maybeSingle();

  if (error) {
    console.error('[external-appointments-api] Error looking up contact:', error);
    return null;
  }

  return data;
}

/**
 * Notifies webhook about appointment changes
 */
async function notifyWebhook(
  supabase: SupabaseClient,
  tenantId: string,
  appointment: any,
  action: 'created' | 'updated' | 'cancelled'
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('appointments_enabled, appointments_webhook_url')
      .eq('tenant_id', tenantId)
      .single();

    if (!settings?.appointments_enabled || !settings?.appointments_webhook_url) {
      return;
    }

    console.log(`[external-appointments-api] Notifying webhook: ${action}`);

    await fetch(settings.appointments_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: `appointment.${action}`,
        data: appointment,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('[external-appointments-api] Webhook notification failed:', error);
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * POST /create - Create a new appointment
 */
async function handleCreate(supabase: SupabaseClient, payload: CreateAppointmentRequest): Promise<Response> {
  console.log('[external-appointments-api/create] Processing create request');

  // Validate required fields
  const requiredError = validateRequired(payload, ['tenant_id', 'type', 'scheduled_at']);
  if (requiredError) {
    return errorResponse(requiredError, 400, 'VALIDATION_ERROR');
  }

  // Validate type
  if (!['call', 'in_person'].includes(payload.type)) {
    return errorResponse("Invalid type. Must be 'call' or 'in_person'", 400, 'VALIDATION_ERROR');
  }

  // Validate type-specific requirements
  if (payload.type === 'call' && !payload.agent_id) {
    return errorResponse("Appointments of type 'call' require agent_id", 400, 'VALIDATION_ERROR');
  }

  if (payload.type === 'in_person' && !payload.location_id) {
    return errorResponse("Appointments of type 'in_person' require location_id", 400, 'VALIDATION_ERROR');
  }

  // Resolve contact_id
  let contactId = payload.contact_id;

  if (!contactId && payload.contact_phone) {
    const contact = await lookupContactByPhone(supabase, payload.tenant_id, payload.contact_phone);
    if (!contact) {
      return errorResponse(
        `Contact not found with phone: ${payload.contact_phone}`,
        404,
        'CONTACT_NOT_FOUND'
      );
    }
    contactId = contact.id;
    console.log(`[external-appointments-api/create] Resolved contact by phone: ${contactId}`);
  }

  if (!contactId) {
    return errorResponse('Either contact_id or contact_phone must be provided', 400, 'VALIDATION_ERROR');
  }

  // Verify contact exists and belongs to tenant
  const { data: contact, error: contactError } = await supabase
    .from('crm_contacts')
    .select('id, tenant_id, numero')
    .eq('id', contactId)
    .eq('tenant_id', payload.tenant_id)
    .maybeSingle();

  if (contactError || !contact) {
    return errorResponse('Contact not found or does not belong to tenant', 404, 'CONTACT_NOT_FOUND');
  }

  // Verify agent exists (for call type)
  if (payload.type === 'call' && payload.agent_id) {
    const { data: agent, error: agentError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payload.agent_id)
      .maybeSingle();

    if (agentError || !agent) {
      return errorResponse('Agent not found', 404, 'AGENT_NOT_FOUND');
    }
  }

  // Verify location exists and belongs to tenant (for in_person type)
  if (payload.type === 'in_person' && payload.location_id) {
    const { data: location, error: locationError } = await supabase
      .from('tenant_locations')
      .select('id, tenant_id, is_active')
      .eq('id', payload.location_id)
      .eq('tenant_id', payload.tenant_id)
      .maybeSingle();

    if (locationError || !location) {
      return errorResponse('Location not found or does not belong to tenant', 404, 'LOCATION_NOT_FOUND');
    }

    if (!location.is_active) {
      return errorResponse('Location is not active', 400, 'LOCATION_INACTIVE');
    }
  }

  // Check availability (unless skipped)
  if (!payload.skip_availability_check) {
    const { data: available, error: availError } = await supabase.rpc('check_appointment_availability', {
      p_tenant_id: payload.tenant_id,
      p_type: payload.type,
      p_scheduled_at: payload.scheduled_at,
      p_duration_minutes: payload.duration_minutes || 30,
      p_agent_id: payload.agent_id || null,
      p_location_id: payload.location_id || null,
      p_exclude_appointment_id: null,
    });

    if (availError) {
      console.error('[external-appointments-api/create] Availability check error:', availError);
      return errorResponse('Error checking availability', 500, 'DATABASE_ERROR');
    }

    if (!available) {
      return errorResponse('The selected time slot is not available', 409, 'SLOT_NOT_AVAILABLE');
    }
  }

  // Normalize phone number if provided
  const callPhoneNumber = payload.call_phone_number
    ? normalizeSpanishPhone(payload.call_phone_number)
    : null;

  // Create the appointment
  const { data: appointment, error: createError } = await supabase
    .from('appointments')
    .insert({
      tenant_id: payload.tenant_id,
      type: payload.type,
      contact_id: contactId,
      agent_id: payload.agent_id || null,
      location_id: payload.location_id || null,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes || 30,
      timezone: payload.timezone || 'Europe/Madrid',
      status: 'scheduled',
      title: payload.title || null,
      description: payload.description || null,
      customer_notes: payload.customer_notes || null,
      call_phone_number: callPhoneNumber,
      metadata: payload.metadata || {},
    })
    .select(
      `
      id,
      type,
      status,
      scheduled_at,
      duration_minutes,
      timezone,
      contact_id,
      agent_id,
      location_id,
      title,
      description,
      customer_notes,
      call_phone_number,
      metadata,
      created_at
    `
    )
    .single();

  if (createError) {
    console.error('[external-appointments-api/create] Error creating appointment:', createError);

    if (createError.code === '23503') {
      return errorResponse('Referenced resource not found', 400, 'FOREIGN_KEY_VIOLATION');
    }

    return errorResponse('Error creating appointment', 500, 'DATABASE_ERROR');
  }

  console.log(`[external-appointments-api/create] Created appointment: ${appointment.id}`);

  // Notify webhook (fire and forget)
  notifyWebhook(supabase, payload.tenant_id, appointment, 'created').catch(() => {});

  return successResponse({ appointment }, 201);
}

/**
 * POST /update-status - Update appointment status
 */
async function handleUpdateStatus(supabase: SupabaseClient, payload: UpdateStatusRequest): Promise<Response> {
  console.log('[external-appointments-api/update-status] Processing update request');

  // Validate required fields
  const requiredError = validateRequired(payload, ['tenant_id', 'appointment_id', 'status']);
  if (requiredError) {
    return errorResponse(requiredError, 400, 'VALIDATION_ERROR');
  }

  // Validate status
  const validStatuses: AppointmentStatus[] = [
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled',
  ];

  if (!validStatuses.includes(payload.status)) {
    return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  // Verify appointment exists and belongs to tenant
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('id, tenant_id, status')
    .eq('id', payload.appointment_id)
    .eq('tenant_id', payload.tenant_id)
    .maybeSingle();

  if (fetchError || !existing) {
    return errorResponse('Appointment not found or does not belong to tenant', 404, 'NOT_FOUND');
  }

  // Build update data
  const updateData: Record<string, any> = {
    status: payload.status,
  };

  if (payload.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
    if (payload.cancelled_reason) {
      updateData.cancelled_reason = payload.cancelled_reason;
    }
  }

  // Update the appointment
  const { data: appointment, error: updateError } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', payload.appointment_id)
    .select(
      `
      id,
      type,
      status,
      scheduled_at,
      duration_minutes,
      contact_id,
      agent_id,
      location_id,
      title,
      cancelled_at,
      cancelled_reason,
      updated_at
    `
    )
    .single();

  if (updateError) {
    console.error('[external-appointments-api/update-status] Error updating:', updateError);
    return errorResponse('Error updating appointment', 500, 'DATABASE_ERROR');
  }

  console.log(`[external-appointments-api/update-status] Updated appointment ${payload.appointment_id} to ${payload.status}`);

  // Notify webhook
  const action = payload.status === 'cancelled' ? 'cancelled' : 'updated';
  notifyWebhook(supabase, payload.tenant_id, appointment, action).catch(() => {});

  return successResponse({
    appointment,
    previous_status: existing.status,
  });
}

/**
 * POST /lookup - Find appointments by criteria
 */
async function handleLookup(supabase: SupabaseClient, payload: LookupRequest): Promise<Response> {
  console.log('[external-appointments-api/lookup] Processing lookup request');

  // Validate required fields
  if (!payload.tenant_id) {
    return errorResponse('Missing required field: tenant_id', 400, 'VALIDATION_ERROR');
  }

  // If appointment_id provided, return single appointment
  if (payload.appointment_id) {
    const { data, error } = await supabase
      .from('v_appointments_detailed')
      .select('*')
      .eq('id', payload.appointment_id)
      .eq('tenant_id', payload.tenant_id)
      .maybeSingle();

    if (error) {
      console.error('[external-appointments-api/lookup] Error:', error);
      return errorResponse('Database error', 500, 'DATABASE_ERROR');
    }

    if (!data) {
      return errorResponse('Appointment not found', 404, 'NOT_FOUND');
    }

    return successResponse({ appointment: data });
  }

  // Resolve contact_id from phone if provided
  let contactId = payload.contact_id;

  if (!contactId && payload.contact_phone) {
    const contact = await lookupContactByPhone(supabase, payload.tenant_id, payload.contact_phone);
    if (contact) {
      contactId = contact.id;
    }
  }

  // Build query
  let query = supabase
    .from('v_appointments_detailed')
    .select('*')
    .eq('tenant_id', payload.tenant_id);

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  if (payload.date_from) {
    query = query.gte('scheduled_at', payload.date_from);
  }

  if (payload.date_to) {
    query = query.lte('scheduled_at', payload.date_to);
  }

  if (payload.status && payload.status.length > 0) {
    query = query.in('status', payload.status);
  }

  if (payload.type) {
    query = query.eq('type', payload.type);
  }

  const limit = Math.min(payload.limit || 50, 100);

  const { data, error } = await query
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[external-appointments-api/lookup] Error:', error);
    return errorResponse('Database error', 500, 'DATABASE_ERROR');
  }

  return successResponse({
    appointments: data || [],
    count: data?.length || 0,
  });
}

/**
 * POST /cancel - Cancel an appointment
 */
async function handleCancel(supabase: SupabaseClient, payload: CancelRequest): Promise<Response> {
  console.log('[external-appointments-api/cancel] Processing cancel request');

  // Validate required fields
  const requiredError = validateRequired(payload, ['tenant_id', 'appointment_id']);
  if (requiredError) {
    return errorResponse(requiredError, 400, 'VALIDATION_ERROR');
  }

  // Verify appointment exists and belongs to tenant
  const { data: existing, error: fetchError } = await supabase
    .from('appointments')
    .select('id, tenant_id, status')
    .eq('id', payload.appointment_id)
    .eq('tenant_id', payload.tenant_id)
    .maybeSingle();

  if (fetchError || !existing) {
    return errorResponse('Appointment not found or does not belong to tenant', 404, 'NOT_FOUND');
  }

  // Check if already cancelled
  if (existing.status === 'cancelled') {
    return errorResponse('Appointment is already cancelled', 400, 'ALREADY_CANCELLED');
  }

  // Cancel the appointment
  const { data: appointment, error: updateError } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: payload.reason || null,
    })
    .eq('id', payload.appointment_id)
    .select(
      `
      id,
      type,
      status,
      scheduled_at,
      duration_minutes,
      contact_id,
      agent_id,
      location_id,
      title,
      cancelled_at,
      cancelled_reason,
      updated_at
    `
    )
    .single();

  if (updateError) {
    console.error('[external-appointments-api/cancel] Error:', updateError);
    return errorResponse('Error cancelling appointment', 500, 'DATABASE_ERROR');
  }

  console.log(`[external-appointments-api/cancel] Cancelled appointment: ${payload.appointment_id}`);

  // Notify webhook
  notifyWebhook(supabase, payload.tenant_id, appointment, 'cancelled').catch(() => {});

  return successResponse({
    appointment,
    previous_status: existing.status,
  });
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Service Role Key from Authorization header
    const authHeader = req.headers.get('Authorization');
    const expectedKey =
      Deno.env.get('EXTERNAL_API_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !expectedKey) {
      console.error('[external-appointments-api] Missing Authorization header or SERVICE_ROLE_KEY');
      return errorResponse('Unauthorized: Missing credentials', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== expectedKey) {
      console.error('[external-appointments-api] Invalid Service Role Key');
      return errorResponse('Unauthorized: Invalid Service Role Key', 401, 'UNAUTHORIZED');
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    console.log(`[external-appointments-api] Received request for action: ${action}`);

    // Only accept POST method
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed. Use POST.', 405, 'METHOD_NOT_ALLOWED');
    }

    // Parse request body
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, 'INVALID_JSON');
    }

    // Route to appropriate handler
    switch (action) {
      case 'create':
        return await handleCreate(supabaseAdmin, payload as CreateAppointmentRequest);

      case 'update-status':
        return await handleUpdateStatus(supabaseAdmin, payload as UpdateStatusRequest);

      case 'lookup':
        return await handleLookup(supabaseAdmin, payload as LookupRequest);

      case 'cancel':
        return await handleCancel(supabaseAdmin, payload as CancelRequest);

      default:
        return errorResponse(
          `Unknown action: ${action}. Valid actions: create, update-status, lookup, cancel`,
          400,
          'UNKNOWN_ACTION'
        );
    }
  } catch (error) {
    console.error('[external-appointments-api] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500, 'INTERNAL_ERROR');
  }
});
