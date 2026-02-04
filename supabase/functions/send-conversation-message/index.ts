import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCredential } from '../_shared/secrets.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessagePayload {
  message_id: string;
  conversation_id: string;
  phone_number_id?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Declare message_id at outer scope so the catch block can update its status
  let message_id: string | undefined;

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payload: SendMessagePayload = await req.json();
    message_id = payload.message_id;
    const { conversation_id, phone_number_id } = payload;

    if (!message_id || !conversation_id) {
      return new Response(
        JSON.stringify({ error: 'Missing message_id or conversation_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Webhook] Processing message:', message_id, 'phone_number_id:', phone_number_id);

    // Fetch message details
    const { data: message, error: messageError } = await supabaseClient
      .from('conversation_messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      console.error('[Webhook] Message not found:', messageError);
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch conversation with contact details
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        contact:crm_contacts!conversations_contact_id_fkey (
          id, nombre, numero, attributes
        )
      `)
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('[Webhook] Conversation not found:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tenant settings (conversations config)
    const { data: tenantSettings, error: tenantError } = await supabaseClient
      .from('tenant_settings')
      .select('conversations_enabled, conversations_webhook_url')
      .eq('tenant_id', conversation.tenant_id)
      .single();

    if (tenantError || !tenantSettings) {
      console.error('[Webhook] Tenant settings not found:', tenantError);
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'Tenant settings not configured'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Tenant settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate conversations channel is enabled
    if (!tenantSettings.conversations_enabled) {
      console.error('[Webhook] Conversations channel not enabled for tenant');
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'Conversations channel not enabled'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Conversations channel not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate webhook URL is configured
    if (!tenantSettings.conversations_webhook_url) {
      console.error('[Webhook] Conversations webhook URL not configured for tenant');
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'Webhook URL not configured'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Webhook URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WEBHOOK_URL = tenantSettings.conversations_webhook_url;
    console.log(`[Webhook] Using tenant webhook: ${WEBHOOK_URL}`);

    // Fetch tenant credential for webhook authentication
    const WEBHOOK_API_KEY = await getCredential(conversation.tenant_id, 'conversations');
    if (!WEBHOOK_API_KEY) {
      console.warn('[Webhook] No credential configured for tenant, proceeding without auth');
    }

    // Fetch tenant details for payload
    let tenantData = null;
    if (conversation.tenant_id) {
      const { data: tenant } = await supabaseClient
        .from('tenants')
        .select('id, name')
        .eq('id', conversation.tenant_id)
        .single();

      tenantData = tenant;
    }

    // Fetch sender (agent) details
    let senderData = null;
    if (message.sender_id) {
      const { data: user } = await supabaseClient
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', message.sender_id)
        .single();

      if (user) {
        senderData = {
          id: user.id,
          full_name: user.full_name,
          email: user.email
        };
      }
    }

    // Validate contact has phone (numero) for WhatsApp
    if (conversation.channel === 'whatsapp' && !conversation.contact?.numero) {
      console.error('[Webhook] Contact missing phone for WhatsApp message');
      await supabaseClient
        .from('conversation_messages')
        .update({ delivery_status: 'failed', error_message: 'Contact missing phone' })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Contact missing phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare file data if message has attachment
    let fileData = null;
    if (message.file_url && message.content_type !== 'text') {
      fileData = {
        file_url: message.file_url,
        file_name: message.file_name,
        file_type: message.file_type,
        file_size: message.file_size,
        mime_type: (message.file_type || '').split(';')[0].trim(),
      };
    }

    // Build webhook payload
    const webhookPayload = {
      event: 'message_sent',
      timestamp: new Date().toISOString(),
      message: {
        id: message.id,
        content: message.content,
        content_type: message.content_type,
        metadata: message.metadata,
        created_at: message.created_at,
        file: fileData,
      },
      conversation: {
        id: conversation.id,
        channel: conversation.channel,
        whatsapp_24h_window_expires_at: conversation.whatsapp_24h_window_expires_at,
        phone_number_id: phone_number_id || conversation.whatsapp_number_id || null
      },
      contact: conversation.contact ? {
        id: conversation.contact.id,
        nombre: conversation.contact.nombre,
        numero: conversation.contact.numero,
        attributes: conversation.contact.attributes
      } : null,
      sender: senderData,
      tenant: tenantData ? {
        id: tenantData.id,
        name: tenantData.name
      } : null
    };

    console.log('[Webhook] Sending payload to:', WEBHOOK_URL);

    // Send POST to external webhook with retry
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const webhookResponse = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(WEBHOOK_API_KEY && { 'Authorization': `Bearer ${WEBHOOK_API_KEY}` }),
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          const responseData = await webhookResponse.json().catch(() => ({}));
          console.log('[Webhook] Success on attempt', attempt);

          // Extract WhatsApp message ID from response
          let whatsappMessageId = null;
          if (responseData?.messages?.[0]?.id) {
            whatsappMessageId = responseData.messages[0].id;
          }

          // Update message status to sent
          const { error: updateError } = await supabaseClient
            .from('conversation_messages')
            .update({
              delivery_status: 'sent',
              external_message_id: whatsappMessageId,
              metadata: {
                ...(typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {}),
                webhook_sent_at: new Date().toISOString(),
                external_response: responseData,
              }
            })
            .eq('id', message_id);

          if (updateError) {
            console.error('[Webhook] Failed to update message status to sent:', updateError);
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Message sent successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await webhookResponse.text();
          lastError = `HTTP ${webhookResponse.status}: ${errorText}`;
          console.error(`[Webhook] Attempt ${attempt} failed:`, lastError);

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[Webhook] Attempt ${attempt} error:`, error);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    console.error('[Webhook] All retries failed:', lastError);
    const { error: failUpdateError } = await supabaseClient
      .from('conversation_messages')
      .update({
        delivery_status: 'failed',
        error_message: lastError,
        metadata: {
          ...(typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {}),
          error: lastError,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', message_id);

    if (failUpdateError) {
      console.error('[Webhook] Failed to update message status to failed:', failUpdateError);
    }

    return new Response(
      JSON.stringify({ error: 'Failed to send message after retries', details: lastError }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);

    // Best-effort update of delivery_status so messages don't stay stuck at "sending"
    if (message_id) {
      try {
        const fallbackClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await fallbackClient
          .from('conversation_messages')
          .update({
            delivery_status: 'failed',
            error_message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
          })
          .eq('id', message_id);
      } catch (updateErr) {
        console.error('[Webhook] Failed to update message status after unexpected error:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
