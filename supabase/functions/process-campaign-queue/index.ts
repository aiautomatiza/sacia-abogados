import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCredential } from '../_shared/secrets.ts';

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('🔄 Iniciando procesamiento de cola de campañas');

    // 0. Recover abandoned batches (stuck in 'processing' for >10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: abandonedBatches, error: abandonedError } = await supabaseAdmin
      .from('campaign_queue')
      .select('id, batch_number, campaign_id')
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo);

    if (abandonedError) {
      console.error('⚠️ Error recuperando batches abandonados:', abandonedError.message);
    } else if (abandonedBatches && abandonedBatches.length > 0) {
      console.log(`♻️ Recuperando ${abandonedBatches.length} batches abandonados`);
      
      for (const batch of abandonedBatches) {
        const { data: currentBatch } = await supabaseAdmin
          .from('campaign_queue')
          .select('retry_count')
          .eq('id', batch.id)
          .single();
        
        const newRetryCount = (currentBatch?.retry_count || 0) + 1;
        
        await supabaseAdmin
          .from('campaign_queue')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            error_message: 'Batch recovered from abandoned processing state',
            scheduled_for: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.id);
        
        console.log(`♻️ Batch ${batch.batch_number} (campaña ${batch.campaign_id}) recuperado (intento ${newRetryCount})`);
      }
    }

    // 1. Get pending batches that should be processed now
    const { data: pendingBatches, error: fetchError } = await supabaseAdmin
      .from('campaign_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process max 10 batches per execution

    if (fetchError) {
      throw new Error(`Error fetching batches: ${fetchError.message}`);
    }

    if (!pendingBatches || pendingBatches.length === 0) {
      console.log('✅ No hay batches pendientes para procesar');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📦 Procesando ${pendingBatches.length} batches pendientes`);
    let successCount = 0;
    let failCount = 0;

    // 2. Process each batch
    for (const batch of pendingBatches) {
      try {
        console.log(`🔄 Procesando batch ${batch.batch_number}/${batch.total_batches} (campaña ${batch.campaign_id})`);

        // Mark as processing
        await supabaseAdmin
          .from('campaign_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', batch.id);

        // Get credential
        const credential = await getCredential(
          batch.tenant_id,
          batch.channel === 'whatsapp' ? 'whatsapp' : 'calls'
        );

        if (!credential) {
          throw new Error('No credential found');
        }

        // Prepare payload
        const payload = {
          ...batch.webhook_payload,
          contacts: batch.contacts,
          batch_info: {
            batch_number: batch.batch_number,
            total_batches: batch.total_batches,
            contacts_in_batch: batch.contacts.length
          }
        };

        // Send to webhook
        const response = await fetch(batch.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${credential}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
      }

      // Increment counter FIRST for atomicity
      await supabaseAdmin.rpc('increment_campaign_batch', {
        p_campaign_id: batch.campaign_id,
        p_status: 'sent'
      });

      // Then mark batch as sent
      await supabaseAdmin
        .from('campaign_queue')
        .update({
          status: 'sent',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id);

        successCount++;
        console.log(`✅ Batch ${batch.batch_number}/${batch.total_batches} enviado (campaña ${batch.campaign_id})`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`❌ Error en batch ${batch.batch_number}:`, errorMessage);

        // Increment retry_count
        const newRetryCount = batch.retry_count + 1;

        // If retries available, reschedule
        if (newRetryCount < 3) {
          const retryDelay = 5 * 60 * 1000; // 5 minutes
          await supabaseAdmin
            .from('campaign_queue')
            .update({
              status: 'pending',
              retry_count: newRetryCount,
              error_message: errorMessage,
              scheduled_for: new Date(Date.now() + retryDelay).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', batch.id);
          
          console.log(`🔄 Batch ${batch.batch_number} reprogramado (intento ${newRetryCount}/3)`);
        } else {
          // Mark as permanently failed
          await supabaseAdmin
            .from('campaign_queue')
            .update({
              status: 'failed',
              error_message: errorMessage,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', batch.id);

          await supabaseAdmin.rpc('increment_campaign_batch', {
            p_campaign_id: batch.campaign_id,
            p_status: 'failed'
          });

          failCount++;
          console.log(`❌ Batch ${batch.batch_number} marcado como fallido permanentemente`);
        }
      }
    }

    console.log(`✅ Procesamiento completado: ${successCount} exitosos, ${failCount} fallidos`);
    
    return new Response(JSON.stringify({
      processed: pendingBatches.length,
      successful: successCount,
      failed: failCount
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error en process-campaign-queue:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
