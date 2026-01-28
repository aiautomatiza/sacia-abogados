import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to divide array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Function to fetch contacts in batches
async function fetchContactsInBatches(
  supabaseClient: any,
  contactIds: string[],
  tenantId: string,
  batchSize: number = 100
): Promise<any[]> {
  const allContacts: any[] = [];
  
  // Dividir IDs en lotes
  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize);
    
    console.log(`Obteniendo lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(contactIds.length/batchSize)} (${batch.length} contactos)`);
    
    const { data: batchContacts, error } = await supabaseClient
      .from('crm_contacts')
      .select('id, numero, nombre, attributes')
      .in('id', batch)
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error(`Error en lote ${i/batchSize + 1}:`, error);
      throw new Error(`Error al obtener contactos: ${error.message}`);
    }
    
    if (batchContacts) {
      allContacts.push(...batchContacts);
    }
  }
  
  return allContacts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cliente con JWT del usuario - para validación y datos del usuario
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Cliente con SERVICE_ROLE - para operaciones privilegiadas (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    // Get user's tenant_id
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('No se pudo obtener el perfil del usuario');
    }

    const { contact_ids, channel, phone_number_id, template_id, template_name } = await req.json();

    if (!contact_ids || !Array.isArray(contact_ids) || !channel) {
      throw new Error('Parámetros inválidos');
    }

    // Validate WhatsApp-specific params
    if (channel === 'whatsapp') {
      if (!phone_number_id) {
        throw new Error('Se requiere phone_number_id para campañas de WhatsApp');
      }
      if (!template_name) {
        throw new Error('Se requiere template_name para campañas de WhatsApp');
      }
    }

    console.log(`Encolando campaña por ${channel} para tenant ${profile.tenant_id}`);

    // Get tenant settings and validate channel
    const { data: settings, error: settingsError } = await userClient
      .from('tenant_settings')
      .select('whatsapp_enabled, calls_enabled, whatsapp_webhook_url, calls_webhook_url, calls_phone_number')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching tenant settings:', settingsError);
      throw new Error('Error al obtener configuración del cliente');
    }

    if (!settings) {
      throw new Error('No hay configuración para este cliente');
    }

    // Validate channel is enabled
    if (channel === 'whatsapp' && !settings.whatsapp_enabled) {
      throw new Error('Canal de WhatsApp no habilitado para este cliente');
    }

    if (channel === 'llamadas' && !settings.calls_enabled) {
      throw new Error('Canal de llamadas no habilitado para este cliente');
    }

    // Get webhook URL from settings
    const webhookUrl = channel === 'whatsapp' 
      ? settings.whatsapp_webhook_url 
      : settings.calls_webhook_url;

    if (!webhookUrl) {
      throw new Error(`No hay webhook configurado para ${channel}`);
    }

    // Get contacts in batches to avoid query limits
    console.log(`Obteniendo ${contact_ids.length} contactos en lotes`);

    let contacts: any[];
    try {
      contacts = await fetchContactsInBatches(
        userClient,
        contact_ids,
        profile.tenant_id,
        100
      );
    } catch (error) {
      console.error('Error al obtener contactos:', error);
      throw new Error('Error al obtener contactos');
    }

    console.log(`✅ Obtenidos ${contacts.length} contactos de ${contact_ids.length} solicitados`);

    if (!contacts || contacts.length === 0) {
      throw new Error('No se encontraron contactos');
    }

    // Validar que obtuvimos todos los contactos esperados
    if (contacts.length !== contact_ids.length) {
      console.warn(`⚠️ Se solicitaron ${contact_ids.length} contactos pero solo se obtuvieron ${contacts.length}`);
    }

    // Prepare base webhook payload
    const baseWebhookPayload: any = {
      tenant_id: profile.tenant_id,
      channel,
    };

    // Add config for WhatsApp campaigns
    if (channel === 'whatsapp') {
      baseWebhookPayload.config = {
        phone_number_id: phone_number_id,
        template_id: template_id,
        template_name: template_name,
      };
      console.log(`WhatsApp config: phone_number_id=${phone_number_id}, template=${template_name}`);
    }

    // Add phone number for calls
    if (channel === 'llamadas' && settings.calls_phone_number) {
      baseWebhookPayload.config = {
        phone_number: settings.calls_phone_number,
      };
    }

    // Calculate batches
    const BATCH_SIZE = 20;
    const batches = chunkArray(contacts, BATCH_SIZE);
    const totalBatches = batches.length;

    console.log(`Preparando ${totalBatches} batches con ${contacts.length} contactos`);

    // 1. Create campaign record
    const { data: campaign, error: campaignError } = await userClient
      .from('campaigns')
      .insert({
        tenant_id: profile.tenant_id,
        channel,
        total_contacts: contacts.length,
        total_batches: totalBatches,
        created_by: user.id
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError);
      throw new Error('Error al crear campaña');
    }

    console.log(`✅ Campaña creada: ${campaign.id}`);

    // 2. Prepare and insert batch queue (with cleanup on failure)
    let queueSuccess = false;
    try {
      const now = new Date();
      const queueInserts = batches.map((batch, index) => ({
        tenant_id: profile.tenant_id,
        campaign_id: campaign.id,
        batch_number: index + 1,
        total_batches: totalBatches,
        channel,
        contacts: batch,
        webhook_url: webhookUrl,
        webhook_payload: baseWebhookPayload,
        // Schedule each batch 2 minutes apart
        scheduled_for: new Date(now.getTime() + (index * 2 * 60 * 1000)).toISOString()
      }));

      // 3. Insert all batches into queue (usando serviceClient para bypass RLS)
      const { error: queueError } = await serviceClient
        .from('campaign_queue')
        .insert(queueInserts);

      if (queueError) {
        throw new Error(`Error al encolar batches: ${queueError.message}`);
      }

      queueSuccess = true;
      const estimatedTimeMinutes = totalBatches > 1 ? (totalBatches - 1) * 2 : 0;
      
      console.log(`✅ Campaña ${campaign.id} encolada: ${totalBatches} batches, tiempo estimado: ~${estimatedTimeMinutes} minutos`);

      // Return immediate response
      return new Response(
        JSON.stringify({
          success: true,
          campaign_id: campaign.id,
          message: 'Campaña encolada exitosamente',
          totalContacts: contacts.length,
          totalBatches: totalBatches,
          estimatedTimeMinutes: estimatedTimeMinutes
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (queueingError) {
      // Cleanup: Delete the campaign if batch queueing failed
      console.error(`❌ Error encolando batches, eliminando campaña ${campaign.id}`);
      await userClient
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);
      throw queueingError;
    }
  } catch (error) {
    console.error('Error en send-campaign:', error);
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
