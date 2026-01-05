import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCredential } from '../_shared/secrets.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { message_id, conversation_id, template_id, follow_up_message, template_variables, phone_number_id } = await req.json();

    if (!message_id || !conversation_id || !template_id) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Template Webhook] Processing template message:", {
      message_id,
      conversation_id,
      template_id,
      template_variables,
      phone_number_id,
    });

    // 1. Fetch message details
    const { data: message, error: msgError } = await supabaseClient
      .from("conversation_messages")
      .select("*")
      .eq("id", message_id)
      .single();

    if (msgError || !message) {
      console.error("[Template Webhook] Message not found:", msgError);
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch conversation with contact details (same structure as send-conversation-message)
    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select(
        `
        *,
        contact:crm_contacts!conversations_contact_id_fkey (
          id,
          name,
          phone,
          email,
          state
        ),
        clinic:org_clinics!conversations_clinic_id_fkey (
          id,
          name
        )
      `,
      )
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      console.error("[Template Webhook] Conversation not found:", convError);
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch tenant settings for WhatsApp webhook
    const { data: tenantSettings, error: tenantError } = await supabaseClient
      .from('tenant_settings')
      .select('whatsapp_enabled, whatsapp_webhook_url')
      .eq('tenant_id', conversation.tenant_id)
      .single();

    if (tenantError || !tenantSettings) {
      console.error('[Template Webhook] Tenant settings not found:', tenantError);
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'Tenant settings not configured'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Tenant settings not configured' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenantSettings.whatsapp_enabled) {
      console.error('[Template Webhook] WhatsApp channel not enabled');
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'WhatsApp channel not enabled'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'WhatsApp channel not enabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenantSettings.whatsapp_webhook_url) {
      console.error('[Template Webhook] WhatsApp webhook URL not configured');
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'WhatsApp webhook URL not configured'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'WhatsApp webhook URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WHATSAPP_WEBHOOK_URL = tenantSettings.whatsapp_webhook_url;
    console.log(`[Template Webhook] Using tenant WhatsApp webhook: ${WHATSAPP_WEBHOOK_URL}`);

    // Fetch WhatsApp credential
    const WEBHOOK_API_KEY = await getCredential(conversation.tenant_id, 'whatsapp');
    if (!WEBHOOK_API_KEY) {
      console.warn('[Template Webhook] No WhatsApp credential configured, proceeding without auth');
    }

    // 4. Fetch template details
    const { data: template, error: templateError } = await supabaseClient
      .from("whatsapp_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      console.error("[Template Webhook] Template not found:", templateError);
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Fetch account details
    let accountData = null;
    if (conversation.account_id) {
      const { data: account } = await supabaseClient
        .from("org_accounts")
        .select("id, name")
        .eq("id", conversation.account_id)
        .single();
      accountData = account;
    }

    // 5. Fetch sender (agent) details
    let senderData = null;
    if (message.sender_id) {
      const { data: profile } = await supabaseClient
        .from("user_profiles")
        .select("user_id, full_name")
        .eq("user_id", message.sender_id)
        .single();

      if (profile) {
        const { data: user } = await supabaseClient.auth.admin.getUserById(message.sender_id);
        senderData = {
          id: profile.user_id,
          full_name: profile.full_name,
          email: user.user?.email || null,
        };
      }
    }

    // 6. Validate contact has phone for WhatsApp
    if (!conversation.contact?.phone) {
      console.error("[Template Webhook] Contact missing phone for WhatsApp template");
      await supabaseClient
        .from("conversation_messages")
        .update({
          delivery_status: "failed",
          error_message: "Contact missing phone number",
        })
        .eq("id", message_id);

      return new Response(JSON.stringify({ error: "Contact missing phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Build webhook payload (same structure as send-conversation-message + template data)
    const webhookPayload = {
      event: "template_message_sent",
      timestamp: new Date().toISOString(),
      message: {
        id: message.id,
        content: message.content,
        content_type: message.content_type,
        metadata: message.metadata,
        created_at: message.created_at,
      },
      template: {
        id: template.id,
        template_id: template.template_id,
        name: template.name,
        category: template.category,
        language: template.language,
        header_text: template.header_text,
        body_text: template.body_text,
        footer_text: template.footer_text,
        variables: template.variables,
        variable_values: template_variables || {},
      },
      follow_up_message: follow_up_message || null,
      conversation: {
        id: conversation.id,
        channel: conversation.channel,
        whatsapp_24h_window_expires_at: conversation.whatsapp_24h_window_expires_at,
        phone_number_id: phone_number_id || conversation.whatsapp_number_id || null,
      },
      contact: conversation.contact
        ? {
            id: conversation.contact.id,
            name: conversation.contact.name,
            phone: conversation.contact.phone,
            email: conversation.contact.email,
            state: conversation.contact.state,
          }
        : null,
      sender: senderData
        ? {
            id: senderData.id,
            full_name: senderData.full_name,
            email: senderData.email,
            type: message.sender_type,
          }
        : null,
      account: accountData
        ? {
            id: accountData.id,
            name: accountData.name,
          }
        : null,
      clinic: conversation.clinic
        ? {
            id: conversation.clinic.id,
            name: conversation.clinic.name,
          }
        : null,
    };

    console.log("[Template Webhook] Sending payload to external service:", WHATSAPP_WEBHOOK_URL);

    // 8. Send POST to external webhook with retry (same retry logic as send-conversation-message)
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const webhookResponse = await fetch(WHATSAPP_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(WEBHOOK_API_KEY && { 'Authorization': `Bearer ${WEBHOOK_API_KEY}` }),
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          const responseData = await webhookResponse.json().catch(() => ({}));
          console.log("[Template Webhook] Success on attempt", attempt, ":", responseData);

          // Extract WhatsApp message ID from response (same logic as send-conversation-message)
          let whatsappMessageId = null;
          try {
            if (
              responseData &&
              responseData.messages &&
              Array.isArray(responseData.messages) &&
              responseData.messages.length > 0
            ) {
              whatsappMessageId = responseData.messages[0].id;
              console.log("[Template Webhook] Extracted WhatsApp message ID (object format):", whatsappMessageId);
            } else if (Array.isArray(responseData) && responseData.length > 0) {
              const firstResponse = responseData[0];
              if (
                firstResponse.messages &&
                Array.isArray(firstResponse.messages) &&
                firstResponse.messages.length > 0
              ) {
                whatsappMessageId = firstResponse.messages[0].id;
                console.log("[Template Webhook] Extracted WhatsApp message ID (array format):", whatsappMessageId);
              }
            }
          } catch (extractError) {
            console.error("[Template Webhook] Error extracting WhatsApp message ID:", extractError);
          }

          // Update message status to sent + save external_message_id
          await supabaseClient
            .from("conversation_messages")
            .update({
              delivery_status: "sent",
              external_message_id: whatsappMessageId,
              metadata: {
                ...message.metadata,
                webhook_sent_at: new Date().toISOString(),
                external_response: responseData,
                whatsapp_message_id: whatsappMessageId,
              },
            })
            .eq("id", message_id);

          return new Response(
            JSON.stringify({
              success: true,
              message: "Template message sent successfully",
              conversation_id,
              whatsapp_message_id: whatsappMessageId,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } else {
          const errorText = await webhookResponse.text();
          lastError = `HTTP ${webhookResponse.status}: ${errorText}`;
          console.error(`[Template Webhook] Attempt ${attempt} failed:`, lastError);

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(`[Template Webhook] Attempt ${attempt} error:`, error);

        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    console.error("[Template Webhook] All retries failed. Last error:", lastError);
    await supabaseClient
      .from("conversation_messages")
      .update({
        delivery_status: "failed",
        error_message: lastError,
        metadata: {
          ...message.metadata,
          error: lastError,
          failed_at: new Date().toISOString(),
        },
      })
      .eq("id", message_id);

    return new Response(
      JSON.stringify({ error: "Failed to send template message after retries", details: lastError }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Template Webhook] Unexpected error:", error);

    // Try to update message status to failed
    try {
      const { message_id } = await req.json();
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      await supabaseClient
        .from("conversation_messages")
        .update({
          delivery_status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq("id", message_id);
    } catch (updateError) {
      console.error("[Template Webhook] Failed to update message status:", updateError);
    }

    return new Response(JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
