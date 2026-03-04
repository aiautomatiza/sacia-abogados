import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ── Inlined credential decryption (from _shared/crypto.ts + _shared/secrets.ts) ──
// This avoids the _shared import that breaks dashboard deploys.

const ENCRYPTED_PREFIX = 'enc:v1:';

function isEncrypted(credential: string | null | undefined): boolean {
  if (!credential) return false;
  return credential.startsWith(ENCRYPTED_PREFIX);
}

async function decryptCredential(encrypted: string): Promise<string> {
  if (!encrypted) throw new Error('Cannot decrypt empty credential');

  // Handle plaintext credentials (backward compatibility)
  if (!isEncrypted(encrypted)) {
    return encrypted;
  }

  const masterKey = Deno.env.get('MASTER_ENCRYPTION_KEY');
  if (!masterKey) throw new Error('MASTER_ENCRYPTION_KEY not set');

  const keyBytes = Uint8Array.from(atob(masterKey), (c) => c.charCodeAt(0));
  if (keyBytes.length < 32) throw new Error('MASTER_ENCRYPTION_KEY must be at least 32 bytes');

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const withoutPrefix = encrypted.slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, ciphertextBase64] = withoutPrefix.split(':');

  if (!ivBase64 || !ciphertextBase64) throw new Error('Invalid encrypted credential format');

  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

async function getCredential(tenantId: string, channel: string): Promise<string | null> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const columnMap: Record<string, string> = {
    whatsapp: 'whatsapp_credential',
    calls: 'calls_credential',
    conversations: 'conversations_credential',
  };

  const columnName = columnMap[channel];
  if (!columnName) return null;

  const { data: creds, error } = await supabaseAdmin
    .from('tenant_credentials')
    .select('whatsapp_credential, calls_credential, conversations_credential')
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error('[Secrets] Failed to fetch credential:', error);
    return null;
  }

  if (!creds) return null;

  const encryptedValue = (creds as Record<string, any>)[columnName];
  if (!encryptedValue) return null;

  try {
    return await decryptCredential(encryptedValue);
  } catch (err) {
    console.error('[Secrets] Failed to decrypt credential:', err);
    return null;
  }
}

// ── End inlined credential logic ──

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

    // 2. Fetch conversation with contact details
    // UPDATED: Using crm_contacts with current field names (nombre, numero)
    // REMOVED: org_clinics join (table no longer exists)
    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select(`
        *,
        contact:crm_contacts!conversations_contact_id_fkey (
          id,
          nombre,
          numero,
          attributes
        )
      `)
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      console.error("[Template Webhook] Conversation not found:", convError);
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch tenant settings — use the CONVERSATIONS webhook (same as send-conversation-message)
    const { data: tenantSettings, error: tenantError } = await supabaseClient
      .from('tenant_settings')
      .select('conversations_enabled, conversations_webhook_url')
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

    if (!tenantSettings.conversations_enabled) {
      console.error('[Template Webhook] Conversations channel not enabled');
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

    if (!tenantSettings.conversations_webhook_url) {
      console.error('[Template Webhook] Conversations webhook URL not configured');
      await supabaseClient
        .from('conversation_messages')
        .update({
          delivery_status: 'failed',
          error_message: 'Conversations webhook URL not configured'
        })
        .eq('id', message_id);

      return new Response(
        JSON.stringify({ error: 'Conversations webhook URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const WEBHOOK_URL = tenantSettings.conversations_webhook_url;
    console.log(`[Template Webhook] Using conversations webhook: ${WEBHOOK_URL}`);

    // Fetch conversations credential (same as send-conversation-message)
    const WEBHOOK_API_KEY = await getCredential(conversation.tenant_id, 'conversations');
    if (!WEBHOOK_API_KEY) {
      console.warn('[Template Webhook] No conversations credential configured, proceeding without auth');
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

    // 5. Fetch tenant details (UPDATED: uses 'tenants' table instead of 'org_accounts')
    let accountData = null;
    if (conversation.tenant_id) {
      const { data: tenant } = await supabaseClient
        .from("tenants")
        .select("id, name")
        .eq("id", conversation.tenant_id)
        .single();
      accountData = tenant;
    }

    // 6. Fetch sender (agent) details (UPDATED: uses 'profiles' table instead of 'user_profiles')
    let senderData = null;
    if (message.sender_id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", message.sender_id)
        .single();

      if (profile) {
        senderData = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
        };
      }
    }

    // 7. Validate contact has phone for WhatsApp (UPDATED: uses 'numero' instead of 'phone')
    if (!conversation.contact?.numero) {
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

    // 8. Build webhook payload (UPDATED: uses 'nombre'/'numero' instead of 'name'/'phone')
    // Build component-aware parameter arrays from variable_values
    // variable_values is keyed like "HEADER-1", "BODY-1", "FOOTER-1"
    const buildComponentParameters = (
      variables: any[],
      variableValuesMap: Record<string, string>,
      component: string
    ) => {
      if (!variables || !Array.isArray(variables)) return [];
      const componentVars = variables
        .filter((v: any) => (v.component || 'BODY') === component)
        .sort((a: any, b: any) => a.position - b.position);
      return componentVars.map((v: any) => ({
        type: 'text',
        text: variableValuesMap[`${component}-${v.position}`] || variableValuesMap[String(v.position)] || '',
      }));
    };

    let tplVariables: any[] = [];
    if (Array.isArray(template.variables)) {
      tplVariables = template.variables;
    } else if (template.variables && typeof template.variables === 'object' && 'items' in (template.variables as any)) {
      tplVariables = (template.variables as any).items;
    }

    const varValues: Record<string, string> = template_variables || {};
    const metaComponents = [];
    const headerParams = buildComponentParameters(tplVariables, varValues, 'HEADER');
    const bodyParams = buildComponentParameters(tplVariables, varValues, 'BODY');
    const footerParams = buildComponentParameters(tplVariables, varValues, 'FOOTER');
    if (headerParams.length > 0) metaComponents.push({ type: 'header', parameters: headerParams });
    if (bodyParams.length > 0) metaComponents.push({ type: 'body', parameters: bodyParams });
    if (footerParams.length > 0) metaComponents.push({ type: 'footer', parameters: footerParams });

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
        // Meta API format: components with parameters grouped by section
        components: metaComponents,
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
          nombre: conversation.contact.nombre,
          numero: conversation.contact.numero,
          attributes: conversation.contact.attributes,
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
      tenant: conversation.tenant_id
        ? {
          id: conversation.tenant_id,
          tenant_id: conversation.tenant_id,
        }
        : null,
    };

    console.log("[Template Webhook] Sending payload to external service:", WEBHOOK_URL);

    // 9. Send POST to external webhook with retry (same retry logic as send-conversation-message)
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const webhookResponse = await fetch(WEBHOOK_URL, {
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
                ...(typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {}),
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
          ...(typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {}),
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
      const clonedReq = req.clone();
      const body = await clonedReq.json().catch(() => ({}));
      if (body.message_id) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await supabaseAdmin
          .from("conversation_messages")
          .update({
            delivery_status: "failed",
            error_message: error instanceof Error ? error.message : String(error),
          })
          .eq("id", body.message_id);
      }
    } catch (updateError) {
      console.error("[Template Webhook] Failed to update message status:", updateError);
    }

    return new Response(JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
