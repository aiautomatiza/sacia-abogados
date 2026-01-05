import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tenant_id,
      integration_name,
      integration_type,
      status,
      provider_user_id,
      provider_account_name,
      scopes,
      error
    } = await req.json();

    if (!tenant_id || !integration_name) {
      throw new Error('Missing required parameters: tenant_id and integration_name');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (error) {
      // OAuth falló
      console.error(`[handle-oauth-callback] OAuth callback error for ${integration_name}:`, error);

      // Intentar actualizar el registro si existe
      const { data: existing } = await supabaseAdmin
        .from('integration_credentials')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('integration_name', integration_name)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('integration_credentials')
          .update({
            status: 'error',
            last_error: error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }

      return new Response(
        JSON.stringify({ success: false, error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`[handle-oauth-callback] Processing OAuth callback for ${integration_name}, tenant: ${tenant_id}`);

    // Guardar credenciales en la base de datos
    const { data: credential, error: dbError } = await supabaseAdmin
      .from('integration_credentials')
      .upsert({
        tenant_id,
        integration_name,
        integration_type: integration_type || 'crm',
        status: status || 'active',
        provider_user_id,
        provider_account_name,
        scopes,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,integration_name',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[handle-oauth-callback] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`[handle-oauth-callback] Credential saved with ID: ${credential.id}`);

    // Crear configuración de sincronización por defecto si no existe
    const { data: existingSetting } = await supabaseAdmin
      .from('integration_sync_settings')
      .select('id')
      .eq('integration_id', credential.id)
      .maybeSingle();

    if (!existingSetting) {
      const { error: settingsError } = await supabaseAdmin
        .from('integration_sync_settings')
        .insert({
          integration_id: credential.id,
          enabled: true,
          sync_frequency: 'manual',
          field_mappings: {},
          sync_filters: {},
        });

      if (settingsError) {
        console.error('[handle-oauth-callback] Error creating sync settings:', settingsError);
        // No lanzamos error, solo log, ya que la credential ya fue guardada
      } else {
        console.log(`[handle-oauth-callback] Sync settings created for integration ${credential.id}`);
      }
    } else {
      console.log(`[handle-oauth-callback] Sync settings already exist for integration ${credential.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, credential }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[handle-oauth-callback] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to handle OAuth callback',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
