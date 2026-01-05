import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySuperAdmin, isValidUrl, isValidPhoneNumber } from '../_shared/auth.ts';
import { storeCredential } from '../_shared/secrets.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is superAdmin
    await verifySuperAdmin(supabaseClient, user.id);

    // Create admin client for privileged operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, tenant_id, settings, credentials } = await req.json();

    console.log('manage-tenant-settings:', { action, tenant_id, user_id: user.id });

    switch (action) {
      case 'get': {
        // Get tenant settings
        const { data, error } = await adminClient
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', tenant_id)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        // Validate settings before saving
        if (settings.whatsapp_enabled && !settings.whatsapp_webhook_url) {
          throw new Error('WhatsApp webhook URL es obligatorio cuando el canal está habilitado');
        }

        if (settings.whatsapp_webhook_url && !isValidUrl(settings.whatsapp_webhook_url)) {
          throw new Error('WhatsApp webhook URL debe ser HTTPS válido');
        }

        if (settings.calls_enabled && !settings.calls_webhook_url) {
          throw new Error('Webhook URL de llamadas es obligatorio cuando el canal está habilitado');
        }

        if (settings.calls_webhook_url && !isValidUrl(settings.calls_webhook_url)) {
          throw new Error('Webhook URL de llamadas debe ser HTTPS válido');
        }

        if (settings.calls_enabled && !settings.calls_phone_number) {
          throw new Error('Número de teléfono es obligatorio cuando las llamadas están habilitadas');
        }

        if (settings.calls_phone_number && !isValidPhoneNumber(settings.calls_phone_number)) {
          throw new Error('Número de teléfono inválido (formato E.164: +[código país][número])');
        }

        // Conversations validations
        if (settings.conversations_enabled && !settings.conversations_webhook_url) {
          throw new Error('Webhook URL de conversaciones es obligatorio cuando el canal está habilitado');
        }

        if (settings.conversations_webhook_url && !isValidUrl(settings.conversations_webhook_url)) {
          throw new Error('Webhook URL de conversaciones debe ser HTTPS válido');
        }

        // Update tenant settings
        const { data, error } = await adminClient
          .from('tenant_settings')
          .update(settings)
          .eq('tenant_id', tenant_id)
          .select()
          .single();

        if (error) throw error;

        // Store credentials if provided
        if (credentials?.whatsapp) {
          await storeCredential(tenant_id, 'whatsapp', credentials.whatsapp);
          console.log('WhatsApp credential stored for tenant:', tenant_id);
        }

        if (credentials?.calls) {
          await storeCredential(tenant_id, 'calls', credentials.calls);
          console.log('Calls credential stored for tenant:', tenant_id);
        }

        if (credentials?.conversations) {
          await storeCredential(tenant_id, 'conversations', credentials.conversations);
          console.log('Conversations credential stored for tenant:', tenant_id);
        }

        console.log('Tenant settings updated:', tenant_id);

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Acción no válida');
    }
  } catch (error: any) {
    console.error('Error in manage-tenant-settings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
