/**
 * @fileoverview Edge Function para procesar archivos de WhatsApp
 * @description Descarga archivos de URLs temporales de WhatsApp y los resube al bucket privado
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessAttachmentRequest {
  message_id: string;
}

interface AttachmentMetadata {
  attachment_processed: boolean;
  processing_attempts: number;
  last_processing_attempt: string;
  processing_error?: string;
  original_whatsapp_url?: string;
  processed_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[ProcessAttachment] Starting attachment processing");

    // Create Supabase client with service role for full access
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const { message_id }: ProcessAttachmentRequest = await req.json();

    if (!message_id) {
      throw new Error("message_id is required");
    }

    console.log(`[ProcessAttachment] Processing message: ${message_id}`);

    // Get message with file info
    const { data: message, error: messageError } = await supabase
      .from("conversation_messages")
      .select("id, file_url, file_name, file_type, file_size, metadata, conversation_id")
      .eq("id", message_id)
      .single();

    if (messageError || !message) {
      console.error("[ProcessAttachment] Message not found:", messageError);
      throw new Error("Message not found");
    }

    // Check if file_url exists
    if (!message.file_url) {
      console.log("[ProcessAttachment] No file_url in message");
      return new Response(JSON.stringify({ success: true, message: "No file to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if it's a WhatsApp URL (temporary URL to download)
    const isWhatsAppUrl =
      message.file_url.includes("whatsapp") ||
      message.file_url.includes("wa.me") ||
      message.file_url.includes("media") ||
      !message.file_url.startsWith("conversation-attachments/");

    if (!isWhatsAppUrl) {
      console.log("[ProcessAttachment] File already processed (not a WhatsApp URL)");
      return new Response(JSON.stringify({ success: true, message: "File already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if already processed
    const metadata: AttachmentMetadata = (message.metadata as any) || {};
    if (metadata.attachment_processed) {
      console.log("[ProcessAttachment] File already processed");
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update processing attempts
    const attempts = (metadata.processing_attempts || 0) + 1;
    console.log(`[ProcessAttachment] Processing attempt ${attempts}`);

    // Check max attempts (3)
    if (attempts > 3) {
      console.error("[ProcessAttachment] Max attempts reached");
      await supabase
        .from("conversation_messages")
        .update({
          metadata: {
            ...metadata,
            processing_attempts: attempts,
            last_processing_attempt: new Date().toISOString(),
            processing_error: "Max retry attempts reached",
          },
        })
        .eq("id", message_id);

      throw new Error("Max retry attempts reached");
    }

    // Mark as processing
    await supabase
      .from("conversation_messages")
      .update({
        metadata: {
          ...metadata,
          processing_attempts: attempts,
          last_processing_attempt: new Date().toISOString(),
          original_whatsapp_url: message.file_url,
        },
      })
      .eq("id", message_id);

    console.log(`[ProcessAttachment] Downloading from WhatsApp URL: ${message.file_url}`);

    // Download file from WhatsApp with timeout (30 seconds)
    const downloadController = new AbortController();
    const downloadTimeout = setTimeout(() => downloadController.abort(), 30000);

    let fileBlob: Blob;
    try {
      const downloadResponse = await fetch(message.file_url, {
        signal: downloadController.signal,
      });

      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }

      fileBlob = await downloadResponse.blob();
      clearTimeout(downloadTimeout);

      console.log(`[ProcessAttachment] Downloaded ${fileBlob.size} bytes`);
    } catch (downloadError: any) {
      clearTimeout(downloadTimeout);
      console.error("[ProcessAttachment] Download error:", downloadError);

      await supabase
        .from("conversation_messages")
        .update({
          metadata: {
            ...metadata,
            processing_attempts: attempts,
            last_processing_attempt: new Date().toISOString(),
            processing_error: `Download failed: ${downloadError.message}`,
          },
        })
        .eq("id", message_id);

      throw new Error(`Download failed: ${downloadError.message}`);
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileBlob.size > maxSize) {
      console.error("[ProcessAttachment] File too large:", fileBlob.size);
      await supabase
        .from("conversation_messages")
        .update({
          metadata: {
            ...metadata,
            processing_attempts: attempts,
            last_processing_attempt: new Date().toISOString(),
            processing_error: `File too large: ${fileBlob.size} bytes (max ${maxSize})`,
          },
        })
        .eq("id", message_id);

      throw new Error("File too large");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split("-")[0];
    const originalExtension = message.file_name?.split(".").pop() || message.file_type?.split("/").pop() || "bin";
    const newFileName = `${timestamp}-${randomId}.${originalExtension}`;
    const storagePath = `conversation-attachments/${newFileName}`;

    console.log(`[ProcessAttachment] Uploading to: ${storagePath}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("conversation-attachments")
      .upload(newFileName, fileBlob, {
        contentType: message.file_type || fileBlob.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("[ProcessAttachment] Upload error:", uploadError);
      await supabase
        .from("conversation_messages")
        .update({
          metadata: {
            ...metadata,
            processing_attempts: attempts,
            last_processing_attempt: new Date().toISOString(),
            processing_error: `Upload failed: ${uploadError.message}`,
          },
        })
        .eq("id", message_id);

      throw uploadError;
    }

    console.log(`[ProcessAttachment] Upload successful: ${uploadData.path}`);

    // Update message with new file path
    const { error: updateError } = await supabase
      .from("conversation_messages")
      .update({
        file_url: uploadData.path, // Store just the path, not full URL
        file_size: fileBlob.size,
        metadata: {
          ...metadata,
          attachment_processed: true,
          processing_attempts: attempts,
          last_processing_attempt: new Date().toISOString(),
          original_whatsapp_url: message.file_url,
          processed_at: new Date().toISOString(),
        },
      })
      .eq("id", message_id);

    if (updateError) {
      console.error("[ProcessAttachment] Update error:", updateError);
      throw updateError;
    }

    console.log("[ProcessAttachment] Processing complete!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        file_path: uploadData.path,
        file_size: fileBlob.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[ProcessAttachment] Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
