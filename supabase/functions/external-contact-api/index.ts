/**
 * @fileoverview External Contact API
 * @description Edge Function for external systems to lookup and update contact statuses
 *
 * Authentication:
 * - Requires Authorization header: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 * - Single credential for both Supabase access and internal validation
 *
 * Endpoints:
 * - POST /functions/v1/external-contact-api/lookup - Find contact by tenant_id + email/numero
 * - POST /functions/v1/external-contact-api/update-status - Update contact status and sync with Pipedrive
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Types
// ============================================================================

interface LookupRequest {
  tenant_id: string;
  email?: string;
  numero?: string;
}

interface UpdateStatusRequest {
  tenant_id: string;
  contact_id: string;
  status_id?: string;      // UUID - optional if status_name provided
  status_name?: string;    // Name lookup - optional if status_id provided
  sync_middleware?: boolean; // Whether to sync with middleware (default: true)
}

interface ContactResult {
  id: string;
  nombre: string | null;
  numero: string;
}

interface StatusResult {
  id: string;
  name: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Normalizes a Spanish phone number to E.164 format
 */
function normalizeSpanishPhone(phone: string | number): string {
  let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');

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
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Creates a JSON success response
 */
function successResponse(data: Record<string, any>) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handles the /lookup endpoint
 * Finds a contact by tenant_id + email or numero
 */
async function handleLookup(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: LookupRequest
): Promise<Response> {
  console.log('[external-contact-api/lookup] Processing lookup request');
  console.log('[external-contact-api/lookup] Payload:', JSON.stringify(payload));

  // Validate required fields
  if (!payload.tenant_id) {
    return errorResponse('Missing required field: tenant_id', 400);
  }

  if (!payload.email && !payload.numero) {
    return errorResponse("At least one of 'email' or 'numero' must be provided", 400);
  }

  // Try lookup by numero first (most common)
  if (payload.numero) {
    const normalizedNumero = normalizeSpanishPhone(payload.numero);
    // Also try without + prefix (some contacts stored as "34xxx" instead of "+34xxx")
    const numeroWithoutPlus = normalizedNumero.startsWith('+') ? normalizedNumero.slice(1) : normalizedNumero;

    console.log(`[external-contact-api/lookup] Looking for numero: ${normalizedNumero} or ${numeroWithoutPlus}`);

    // Search for both formats: +34xxx and 34xxx
    // Use .in() instead of .or() to avoid URL encoding issues with the + character
    const numerosToSearch = [normalizedNumero];
    if (numeroWithoutPlus !== normalizedNumero) {
      numerosToSearch.push(numeroWithoutPlus);
    }

    const { data: contactsByNumero, error: numeroError } = await supabaseAdmin
      .from('crm_contacts')
      .select('id, nombre, numero')
      .eq('tenant_id', payload.tenant_id)
      .in('numero', numerosToSearch)
      .limit(1);

    if (numeroError) {
      console.error('[external-contact-api/lookup] Error looking up by numero:', JSON.stringify(numeroError));
      return errorResponse('Database error', 500);
    }

    const contactByNumero = contactsByNumero?.[0];
    if (contactByNumero) {
      console.log(`[external-contact-api/lookup] Found contact by numero: ${contactByNumero.id}`);
      return successResponse({
        contact: {
          id: contactByNumero.id,
          nombre: contactByNumero.nombre,
          numero: contactByNumero.numero,
        },
      });
    }
  }

  // Try lookup by email in attributes
  if (payload.email) {
    const emailLower = payload.email.toLowerCase().trim();
    console.log(`[external-contact-api/lookup] Looking up by email: ${emailLower}`);

    // Query contacts with email in attributes (case-insensitive)
    // We need to check both 'email' and 'Email' keys in attributes JSON
    const { data: contacts, error: emailError } = await supabaseAdmin
      .from('crm_contacts')
      .select('id, nombre, numero, attributes')
      .eq('tenant_id', payload.tenant_id);

    if (emailError) {
      console.error('[external-contact-api/lookup] Error looking up by email:', emailError);
      return errorResponse('Database error', 500);
    }

    // Filter in memory for case-insensitive email match
    const contactByEmail = contacts?.find((c: any) => {
      const attrs = c.attributes || {};
      const contactEmail = (attrs.email || attrs.Email || '').toString().toLowerCase().trim();
      return contactEmail === emailLower;
    });

    if (contactByEmail) {
      console.log(`[external-contact-api/lookup] Found contact by email: ${contactByEmail.id}`);
      return successResponse({
        contact: {
          id: contactByEmail.id,
          nombre: contactByEmail.nombre,
          numero: contactByEmail.numero,
        },
      });
    }
  }

  // No contact found
  console.log('[external-contact-api/lookup] Contact not found');
  return errorResponse('Contact not found', 404);
}

/**
 * Handles the /update-status endpoint
 * Updates a contact's status and syncs with Pipedrive middleware
 */
async function handleUpdateStatus(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: UpdateStatusRequest
): Promise<Response> {
  console.log('[external-contact-api/update-status] Processing update request');

  // Validate required fields
  if (!payload.tenant_id) {
    return errorResponse('Missing required field: tenant_id', 400);
  }

  if (!payload.contact_id) {
    return errorResponse('Missing required field: contact_id', 400);
  }

  if (!payload.status_id && !payload.status_name) {
    return errorResponse('Either status_id or status_name must be provided', 400);
  }

  // Step 1: Verify tenant exists
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('id', payload.tenant_id)
    .maybeSingle();

  if (tenantError) {
    console.error('[external-contact-api/update-status] Error checking tenant:', tenantError);
    return errorResponse('Database error', 500);
  }

  if (!tenant) {
    return errorResponse('Tenant not found', 404);
  }

  // Step 2: Verify contact exists and belongs to tenant
  const { data: contact, error: contactError } = await supabaseAdmin
    .from('crm_contacts')
    .select('id, nombre, numero, tenant_id')
    .eq('id', payload.contact_id)
    .eq('tenant_id', payload.tenant_id)
    .maybeSingle();

  if (contactError) {
    console.error('[external-contact-api/update-status] Error checking contact:', contactError);
    return errorResponse('Database error', 500);
  }

  if (!contact) {
    return errorResponse('Contact not found or does not belong to tenant', 404);
  }

  // Step 3: Verify status exists, is active, and belongs to tenant
  // Support lookup by status_id (UUID) or status_name (string)
  let statusQuery = supabaseAdmin
    .from('crm_contact_statuses')
    .select('id, name, is_active, tenant_id')
    .eq('tenant_id', payload.tenant_id);

  if (payload.status_id) {
    statusQuery = statusQuery.eq('id', payload.status_id);
  } else if (payload.status_name) {
    statusQuery = statusQuery.eq('name', payload.status_name);
  }

  const { data: status, error: statusError } = await statusQuery.maybeSingle();

  if (statusError) {
    console.error('[external-contact-api/update-status] Error checking status:', statusError);
    return errorResponse('Database error', 500);
  }

  if (!status) {
    return errorResponse('Status not found or does not belong to tenant', 404);
  }

  if (!status.is_active) {
    return errorResponse('Status is not active', 400);
  }

  // Step 4: Update contact status (use resolved status.id from lookup)
  const { error: updateError } = await supabaseAdmin
    .from('crm_contacts')
    .update({
      status_id: status.id,
      status_updated_at: new Date().toISOString(),
      // Note: status_updated_by is null since this is an external system update
    })
    .eq('id', payload.contact_id);

  if (updateError) {
    console.error('[external-contact-api/update-status] Error updating contact:', updateError);
    return errorResponse('Error updating contact status', 500);
  }

  console.log(`[external-contact-api/update-status] Contact ${payload.contact_id} status updated to ${status.id} (${status.name})`);

  // Step 5: Sync with Pipedrive middleware (skip if sync_middleware is explicitly false)
  const shouldSyncMiddleware = payload.sync_middleware !== false && String(payload.sync_middleware).toLowerCase() !== 'false';
  console.log(`[external-contact-api/update-status] sync_middleware param: ${JSON.stringify(payload.sync_middleware)} (type: ${typeof payload.sync_middleware}) -> shouldSync: ${shouldSyncMiddleware}`);
  let middlewareSynced = false;
  const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');
  const internalApiKey = Deno.env.get('INTERNAL_API_KEY');

  if (shouldSyncMiddleware && middlewareUrl && internalApiKey) {
    try {
      const middlewarePayload = {
        title: contact.nombre || 'Sin nombre',
        contactPhone: contact.numero,
        labelName: status.name,
      };

      console.log('[external-contact-api/update-status] Calling middleware:', middlewareUrl);

      const response = await fetch(`${middlewareUrl}/api/sync/lead-with-label`, {
        method: 'POST',
        headers: {
          'X-API-Key': internalApiKey,
          'X-Tenant-ID': payload.tenant_id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(middlewarePayload),
      });

      if (response.ok) {
        middlewareSynced = true;
        const result = await response.json();
        console.log('[external-contact-api/update-status] Middleware sync successful:', result);
      } else {
        const errorText = await response.text();
        console.error(`[external-contact-api/update-status] Middleware sync failed: ${response.status} - ${errorText}`);
      }
    } catch (middlewareError) {
      console.error('[external-contact-api/update-status] Middleware sync error:', middlewareError);
    }
  } else if (!shouldSyncMiddleware) {
    console.log('[external-contact-api/update-status] Middleware sync skipped (sync_middleware=false)');
  } else {
    console.warn('[external-contact-api/update-status] MIDDLEWARE_URL or INTERNAL_API_KEY not configured, skipping sync');
  }

  return successResponse({
    contact: {
      id: contact.id,
      nombre: contact.nombre,
      numero: contact.numero,
    },
    status: {
      id: status.id,
      name: status.name,
    },
    middleware_synced: middlewareSynced,
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
    // Format: "Bearer <service-role-key>"
    const authHeader = req.headers.get('Authorization');
    // Try custom secret first, fall back to built-in (which may be incorrect in some environments)
    const expectedKey = Deno.env.get('EXTERNAL_API_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !expectedKey) {
      console.error('[external-contact-api] Missing Authorization header or SERVICE_ROLE_KEY');
      return errorResponse('Unauthorized: Missing credentials', 401);
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== expectedKey) {
      console.error('[external-contact-api] Invalid Service Role Key');
      return errorResponse('Unauthorized: Invalid Service Role Key', 401);
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request URL to determine action
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Last segment is the action

    console.log(`[external-contact-api] Received request for action: ${action}`);

    // Only accept POST method
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed. Use POST.', 405);
    }

    // Parse request body
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    // Route to appropriate handler
    switch (action) {
      case 'lookup':
        return await handleLookup(supabaseAdmin, payload as LookupRequest);

      case 'update-status':
        return await handleUpdateStatus(supabaseAdmin, payload as UpdateStatusRequest);

      default:
        return errorResponse(`Unknown action: ${action}. Valid actions: lookup, update-status`, 400);
    }
  } catch (error) {
    console.error('[external-contact-api] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(errorMessage, 500);
  }
});
