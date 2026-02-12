import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizePhone } from '../_shared/phone.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  numero: string;
  nombre?: string | null;
  external_crm_id?: string | null;
  attributes?: Record<string, any>;
  skip_external_sync?: boolean; // Skip middleware notification (avoid loops)
}

/**
 * Verifica si el tenant tiene integraciones activas
 */
async function checkActiveIntegrations(tenantId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .from('integration_credentials')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('[create-contact] Error checking integrations:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('[create-contact] Unexpected error checking integrations:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with user auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's tenant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener el perfil del usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contactData: ContactData = await req.json();

    // Debug: Log incoming data
    console.log('[create-contact] Received contact data:', JSON.stringify(contactData));

    if (!contactData.numero) {
      return new Response(
        JSON.stringify({ error: 'El número de teléfono es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-contact] Creating contact for tenant ${profile.tenant_id}`);

    // Normalizar el número de teléfono
    const normalizedNumero = normalizePhone(contactData.numero);

    if (normalizedNumero !== contactData.numero) {
      console.log(`[create-contact] Número normalizado: ${contactData.numero} -> ${normalizedNumero}`);
    }

    // Check if contact already exists
    const { data: existing, error: selectError } = await supabaseClient
      .from('crm_contacts')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('numero', normalizedNumero)
      .maybeSingle();

    if (selectError) {
      console.error('[create-contact] Error checking existing contact:', selectError);
      return new Response(
        JSON.stringify({ error: 'Error al verificar contacto existente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({ error: `Ya existe un contacto con el número ${normalizedNumero}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new contact in database
    const { data: newContact, error: insertError } = await supabaseClient
      .from('crm_contacts')
      .insert({
        tenant_id: profile.tenant_id,
        numero: normalizedNumero,
        nombre: contactData.nombre || null,
        external_crm_id: contactData.external_crm_id || null,
        attributes: contactData.attributes || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('[create-contact] Error creating contact:', insertError);
      return new Response(
        JSON.stringify({ error: `Error al crear contacto: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-contact] Contact created with ID: ${newContact.id}`);

    // Notify middleware about new contact (only if not skipped and tenant has active integrations)
    const shouldNotifyMiddleware = !contactData.skip_external_sync;

    if (shouldNotifyMiddleware) {
      const hasActiveIntegrations = await checkActiveIntegrations(profile.tenant_id);

      if (hasActiveIntegrations) {
        const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');

        if (middlewareUrl) {
          try {
            console.log(`[create-contact] Notifying middleware at ${middlewareUrl}`);

            // Extract fields from contact attributes
            const attributes = newContact.attributes || {};

            // Debug logging
            console.log('[create-contact] Contact attributes:', JSON.stringify(attributes));

            // Validate email exists (required by middleware)
            const email = attributes.email || attributes.Email || '';
            if (!email || email.trim() === '') {
              console.warn('[create-contact] Contact has no email, skipping middleware sync');
              // Don't sync to middleware if no email (required field)
            } else {
              // Build middleware payload
              const middlewarePayload: any = {
                name: newContact.nombre || 'Sin nombre',
                email: email.trim(),
                phone: newContact.numero,
              };

              // Add optional fields if present
              if (attributes.company || attributes.Company) {
                middlewarePayload.company = attributes.company || attributes.Company;
              }
              if (attributes.notes || attributes.Notes) {
                middlewarePayload.notes = attributes.notes || attributes.Notes;
              }

              // Debug logging
              console.log('[create-contact] Middleware payload:', JSON.stringify(middlewarePayload));

              const middlewareResponse = await fetch(`${middlewareUrl}/api/sync/contact`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': req.headers.get('Authorization')!,
                },
                body: JSON.stringify(middlewarePayload),
              });

              if (!middlewareResponse.ok) {
                const errorText = await middlewareResponse.text();
                console.error(`[create-contact] Middleware notification failed: ${middlewareResponse.status} - ${errorText}`);
                // No fallar la creación del contacto si el middleware falla
                // El contacto ya fue creado exitosamente
              } else {
                const result = await middlewareResponse.json();
                console.log('[create-contact] Middleware notified successfully:', result);
              }
            }
          } catch (middlewareError) {
            console.error('[create-contact] Error notifying middleware:', middlewareError);
            // No fallar la creación del contacto si el middleware falla
          }
        } else {
          console.warn('[create-contact] Middleware URL not configured, skipping notification');
        }
      } else {
        console.log('[create-contact] No active integrations for tenant, skipping middleware notification');
      }
    } else {
      console.log('[create-contact] External sync skipped per request parameter');
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: {
          ...newContact,
          attributes: newContact.attributes || {},
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );

  } catch (error) {
    console.error('[create-contact] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
