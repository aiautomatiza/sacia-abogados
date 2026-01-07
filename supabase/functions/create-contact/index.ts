import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactData {
  numero: string;
  nombre?: string | null;
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

/**
 * Normaliza un número de teléfono español
 * - Elimina espacios, guiones y caracteres no numéricos (excepto +)
 * - Detecta números españoles (9 dígitos empezando por 6, 7, 8 o 9)
 * - Añade prefijo +34 si es necesario
 */
function normalizeSpanishPhone(phone: string): string {
  // 1. Limpiar: eliminar espacios, guiones, paréntesis
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // 2. Si ya tiene prefijo +34, normalizar y retornar
  if (cleaned.startsWith('+34')) {
    return cleaned;
  }

  // 3. Si tiene prefijo 0034, convertir a +34
  if (cleaned.startsWith('0034')) {
    return '+34' + cleaned.slice(4);
  }

  // 4. Si tiene prefijo 34 (sin +) y el resto son 9 dígitos válidos
  if (cleaned.startsWith('34') && cleaned.length === 11) {
    const withoutPrefix = cleaned.slice(2);
    if (/^[6789]\d{8}$/.test(withoutPrefix)) {
      return '+34' + withoutPrefix;
    }
  }

  // 5. Si es un número español de 9 dígitos (empieza por 6, 7, 8 o 9)
  if (/^[6789]\d{8}$/.test(cleaned)) {
    return '+34' + cleaned;
  }

  // 6. Si no coincide con patrón español, retornar limpio (puede ser internacional)
  return cleaned.startsWith('+') ? cleaned : cleaned;
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

    if (!contactData.numero) {
      return new Response(
        JSON.stringify({ error: 'El número de teléfono es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-contact] Creating contact for tenant ${profile.tenant_id}`);

    // Normalizar el número de teléfono
    const normalizedNumero = normalizeSpanishPhone(contactData.numero);

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

            // Build middleware payload
            const middlewarePayload: any = {
              name: newContact.nombre || 'Sin nombre',
              email: attributes.email || '', // Email is required by middleware
              phone: newContact.numero,
            };

            // Add optional fields if present
            if (attributes.company) {
              middlewarePayload.company = attributes.company;
            }
            if (attributes.notes) {
              middlewarePayload.notes = attributes.notes;
            }

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
