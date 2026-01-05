import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
};

// Utilidades para manejo de objetos anidados
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncLogId: string | null = null;

  try {
    const { integration_id, tenant_id, filters } = await req.json();

    if (!integration_id || !tenant_id) {
      throw new Error('Missing required parameters: integration_id and tenant_id');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[sync-contacts] Starting sync for integration: ${integration_id}, tenant: ${tenant_id}`);

    // Obtener configuración de la integración
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_credentials')
      .select('*, integration_sync_settings(*)')
      .eq('id', integration_id)
      .single();

    if (integrationError) {
      throw new Error(`Integration not found: ${integrationError.message}`);
    }

    if (integration.tenant_id !== tenant_id) {
      throw new Error('Integration does not belong to this tenant');
    }

    if (integration.status !== 'active') {
      throw new Error(`Integration is not active. Current status: ${integration.status}`);
    }

    // Crear log de sincronización
    const { data: syncLog, error: syncLogError } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        tenant_id,
        integration_id,
        operation: 'export_contacts',
        direction: 'outbound',
        status: 'processing',
        started_at: new Date().toISOString(),
        triggered_by: req.headers.get('x-user-id'),
        trigger_type: 'manual',
      })
      .select()
      .single();

    if (syncLogError) {
      throw new Error(`Failed to create sync log: ${syncLogError.message}`);
    }

    syncLogId = syncLog.id;

    console.log(`[sync-contacts] Sync log created with ID: ${syncLogId}`);

    // Obtener contactos del tenant
    let query = supabaseAdmin
      .from('crm_contacts')
      .select('*')
      .eq('tenant_id', tenant_id);

    // Aplicar filtros si existen
    if (filters?.search) {
      query = query.or(`numero.ilike.%${filters.search}%,nombre.ilike.%${filters.search}%`);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    console.log(`[sync-contacts] Found ${contacts.length} contacts to sync`);

    // Actualizar total_records
    await supabaseAdmin
      .from('sync_logs')
      .update({ total_records: contacts.length })
      .eq('id', syncLogId);

    if (contacts.length === 0) {
      // No hay contactos para sincronizar
      await supabaseAdmin
        .from('sync_logs')
        .update({
          status: 'success',
          processed_records: 0,
          failed_records: 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId);

      return new Response(
        JSON.stringify({
          success: true,
          sync_log_id: syncLogId,
          processed: 0,
          failed: 0,
          message: 'No contacts to sync',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Preparar datos con mapeo de campos
    const syncSettings = integration.integration_sync_settings?.[0];
    const fieldMappings = syncSettings?.field_mappings || {};

    console.log(`[sync-contacts] Using field mappings:`, fieldMappings);

    const mappedContacts = contacts.map(contact => {
      const mapped: any = {};

      // Si no hay mappings, enviar datos básicos
      if (Object.keys(fieldMappings).length === 0) {
        mapped.numero = contact.numero;
        mapped.nombre = contact.nombre;
        mapped.attributes = contact.attributes || {};
      } else {
        // Aplicar mapeo de campos
        for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
          const value = getNestedValue(contact, sourceField);
          if (value !== undefined && value !== null) {
            setNestedValue(mapped, targetField as string, value);
          }
        }
      }

      return {
        external_id: contact.id,
        data: mapped,
      };
    });

    // Enviar al middleware
    const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');
    if (!middlewareUrl) {
      throw new Error('MIDDLEWARE_URL environment variable is not configured');
    }

    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    console.log(`[sync-contacts] Sending ${mappedContacts.length} contacts to middleware`);

    const response = await fetch(`${middlewareUrl}/api/sync/contacts/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization')!,
        'X-JWT-Secret': jwtSecret,
      },
      body: JSON.stringify({
        tenant_id,
        integration_id,
        integration_name: integration.integration_name,
        contacts: mappedContacts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sync-contacts] Middleware error: ${response.status} - ${errorText}`);
      throw new Error(`Middleware sync failed: ${response.statusText}`);
    }

    const result = await response.json();

    console.log(`[sync-contacts] Middleware response:`, result);

    // Actualizar log con resultados
    await supabaseAdmin
      .from('sync_logs')
      .update({
        status: 'success',
        processed_records: result.processed_count || contacts.length,
        failed_records: result.failed_count || 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);

    // Actualizar last_sync_at en integration_credentials
    await supabaseAdmin
      .from('integration_credentials')
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', integration_id);

    console.log(`[sync-contacts] Sync completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        sync_log_id: syncLogId,
        processed: result.processed_count || contacts.length,
        failed: result.failed_count || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[sync-contacts] Error:', error);

    // Si existe syncLog, marcarlo como fallido
    if (syncLogId) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        await supabaseAdmin
          .from('sync_logs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      } catch (updateError) {
        console.error('[sync-contacts] Error updating sync log:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync contacts',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
