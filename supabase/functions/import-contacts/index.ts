import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizePhone } from '../_shared/phone.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contact {
  numero: string;
  nombre?: string;
  external_crm_id?: string | null;
  attributes?: Record<string, any>;
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
      console.error('[import-contacts] Error checking integrations:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('[import-contacts] Unexpected error checking integrations:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      throw new Error('Usuario no autenticado');
    }

    // Get user's tenant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo obtener el perfil del usuario');
    }

    const { contacts } = await req.json() as { contacts: Contact[] };

    if (!contacts || !Array.isArray(contacts)) {
      throw new Error('Formato de datos inválido');
    }

    console.log(`Procesando ${contacts.length} contactos para tenant ${profile.tenant_id}`);

    let created = 0;
    let updated = 0;
    const contactIds: string[] = [];

    for (const contact of contacts) {
      if (!contact.numero) {
        console.log('Contacto sin número, saltando...');
        continue;
      }

      // Normalizar el número antes de procesarlo
      const normalizedNumero = normalizePhone(contact.numero);
      
      // Logging para debugging
      if (normalizedNumero !== contact.numero) {
        console.log(`Número normalizado: ${contact.numero} -> ${normalizedNumero}`);
      }

      // Check if contact exists (usando el número normalizado)
      const { data: existing, error: selectError } = await supabaseClient
        .from('crm_contacts')
        .select('id, attributes')
        .eq('tenant_id', profile.tenant_id)
        .eq('numero', normalizedNumero)
        .maybeSingle();

      if (selectError) {
        console.error('Error al buscar contacto:', selectError);
        continue;
      }

      if (existing) {
        // Update existing contact - merge attributes
        const mergedAttributes = {
          ...existing.attributes,
          ...contact.attributes,
        };

        const updateData: Record<string, any> = {
          nombre: contact.nombre || null,
          attributes: mergedAttributes,
        };
        if (contact.external_crm_id !== undefined) {
          updateData.external_crm_id = contact.external_crm_id || null;
        }

        const { error: updateError } = await supabaseClient
          .from('crm_contacts')
          .update(updateData)
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error al actualizar contacto:', updateError);
        } else {
          updated++;
          contactIds.push(existing.id);
        }
      } else {
        // Create new contact
        const { data: newContact, error: insertError } = await supabaseClient
          .from('crm_contacts')
          .insert({
            tenant_id: profile.tenant_id,
            numero: normalizedNumero,
            nombre: contact.nombre || null,
            external_crm_id: contact.external_crm_id || null,
            attributes: contact.attributes || {},
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error al crear contacto:', insertError);
        } else {
          created++;
          contactIds.push(newContact.id);
        }
      }
    }

    const total = created + updated;
    console.log(`Importación completada: ${created} creados, ${updated} actualizados`);

    // Notify middleware if tenant has active integrations and contacts were created
    if (created > 0) {
      const hasActiveIntegrations = await checkActiveIntegrations(profile.tenant_id);

      if (hasActiveIntegrations) {
        const middlewareUrl = Deno.env.get('MIDDLEWARE_URL');

        if (middlewareUrl) {
          try {
            // Get the created contacts data
            const { data: createdContacts } = await supabaseClient
              .from('crm_contacts')
              .select('*')
              .in('id', contactIds.slice(0, created)); // Only newly created ones

            if (createdContacts && createdContacts.length > 0) {
              console.log(`[import-contacts] Notifying middleware about ${createdContacts.length} new contacts`);

              // Send contacts to middleware one by one (in parallel)
              const syncPromises = createdContacts.map(async (contact) => {
                const attributes = contact.attributes || {};

                // Validate email exists (required by middleware)
                const email = attributes.email || attributes.Email || '';
                if (!email || email.trim() === '') {
                  console.warn(`[import-contacts] Contact ${contact.numero} has no email, skipping middleware sync`);
                  return { success: false, contact: contact.numero, reason: 'No email' };
                }

                // Build middleware payload
                const middlewarePayload: any = {
                  name: contact.nombre || 'Sin nombre',
                  email: email.trim(),
                  phone: contact.numero,
                };

                // Add optional fields if present
                if (attributes.company || attributes.Company) {
                  middlewarePayload.company = attributes.company || attributes.Company;
                }
                if (attributes.notes || attributes.Notes) {
                  middlewarePayload.notes = attributes.notes || attributes.Notes;
                }

                try {
                  const response = await fetch(`${middlewareUrl}/api/sync/contact`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': req.headers.get('Authorization')!,
                    },
                    body: JSON.stringify(middlewarePayload),
                  });

                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[import-contacts] Failed to sync contact ${contact.numero}: ${response.status} - ${errorText}`);
                    return { success: false, contact: contact.numero };
                  }

                  const result = await response.json();
                  console.log(`[import-contacts] Contact ${contact.numero} synced:`, result);
                  return { success: true, contact: contact.numero };
                } catch (error) {
                  console.error(`[import-contacts] Error syncing contact ${contact.numero}:`, error);
                  return { success: false, contact: contact.numero };
                }
              });

              const results = await Promise.all(syncPromises);
              const successful = results.filter(r => r.success).length;
              const failed = results.filter(r => !r.success).length;
              console.log(`[import-contacts] Middleware sync completed: ${successful} successful, ${failed} failed`);
            }
          } catch (middlewareError) {
            console.error('[import-contacts] Error notifying middleware:', middlewareError);
            // Don't fail the import if middleware fails
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        stats: { total, created, updated },
        contactIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error en import-contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
