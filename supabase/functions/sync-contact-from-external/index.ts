import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-jwt-secret',
};

interface SyncContactPayload {
  tenant_id: string;
  integration_name: string;
  contacts: Array<{
    external_id: string;
    numero: string;
    nombre?: string | null;
    attributes?: Record<string, any>;
  }>;
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
    // Validate JWT Secret for security (authentication for external systems)
    const jwtSecret = req.headers.get('X-JWT-Secret');
    const expectedSecret = Deno.env.get('JWT_SECRET');

    if (!jwtSecret || !expectedSecret || jwtSecret !== expectedSecret) {
      console.error('[sync-contact-from-external] Invalid or missing JWT Secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid JWT Secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SyncContactPayload = await req.json();

    // Validate required fields
    if (!payload.tenant_id || !payload.integration_name || !Array.isArray(payload.contacts)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, integration_name, contacts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-contact-from-external] Syncing ${payload.contacts.length} contacts from ${payload.integration_name} for tenant ${payload.tenant_id}`);

    // Verify that the integration exists and is active
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integration_credentials')
      .select('id, status')
      .eq('tenant_id', payload.tenant_id)
      .eq('integration_name', payload.integration_name)
      .maybeSingle();

    if (integrationError) {
      console.error('[sync-contact-from-external] Error checking integration:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Error verifying integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration) {
      return new Response(
        JSON.stringify({ error: `Integration ${payload.integration_name} not found for this tenant` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (integration.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Integration ${payload.integration_name} is not active (status: ${integration.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each contact
    for (const contact of payload.contacts) {
      if (!contact.numero) {
        console.warn('[sync-contact-from-external] Contact without numero, skipping');
        failed++;
        errors.push('Contact without numero');
        continue;
      }

      try {
        // Normalize phone number
        const normalizedNumero = normalizeSpanishPhone(contact.numero);

        if (normalizedNumero !== contact.numero) {
          console.log(`[sync-contact-from-external] Número normalizado: ${contact.numero} -> ${normalizedNumero}`);
        }

        // Enrich attributes with sync metadata
        const syncMetadata = {
          source: payload.integration_name,
          external_id: contact.external_id,
          synced_at: new Date().toISOString(),
          last_sync_direction: 'inbound',
        };

        const enrichedAttributes = {
          ...(contact.attributes || {}),
          _sync_metadata: syncMetadata,
        };

        // Check if contact exists
        const { data: existing, error: selectError } = await supabaseAdmin
          .from('crm_contacts')
          .select('id, attributes')
          .eq('tenant_id', payload.tenant_id)
          .eq('numero', normalizedNumero)
          .maybeSingle();

        if (selectError) {
          console.error('[sync-contact-from-external] Error checking existing contact:', selectError);
          failed++;
          errors.push(`Error checking contact ${contact.numero}: ${selectError.message}`);
          continue;
        }

        if (existing) {
          // Update existing contact - merge attributes
          const mergedAttributes = {
            ...existing.attributes,
            ...enrichedAttributes,
            _sync_metadata: syncMetadata, // Always update sync metadata
          };

          const { error: updateError } = await supabaseAdmin
            .from('crm_contacts')
            .update({
              nombre: contact.nombre || null,
              attributes: mergedAttributes,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('[sync-contact-from-external] Error updating contact:', updateError);
            failed++;
            errors.push(`Error updating contact ${contact.numero}: ${updateError.message}`);
          } else {
            updated++;
            console.log(`[sync-contact-from-external] Contact updated: ${normalizedNumero}`);
          }
        } else {
          // Create new contact
          const { error: insertError } = await supabaseAdmin
            .from('crm_contacts')
            .insert({
              tenant_id: payload.tenant_id,
              numero: normalizedNumero,
              nombre: contact.nombre || null,
              attributes: enrichedAttributes,
            });

          if (insertError) {
            console.error('[sync-contact-from-external] Error creating contact:', insertError);
            failed++;
            errors.push(`Error creating contact ${contact.numero}: ${insertError.message}`);
          } else {
            created++;
            console.log(`[sync-contact-from-external] Contact created: ${normalizedNumero}`);
          }
        }
      } catch (contactError) {
        console.error('[sync-contact-from-external] Error processing contact:', contactError);
        failed++;
        errors.push(`Error processing contact ${contact.numero}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`);
      }
    }

    const total = created + updated;
    console.log(`[sync-contact-from-external] Sync completed: ${created} created, ${updated} updated, ${failed} failed`);

    // IMPORTANT: Do NOT notify middleware to prevent infinite loops
    // This function is specifically for contacts coming FROM external integrations

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total,
          created,
          updated,
          failed,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[sync-contact-from-external] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
