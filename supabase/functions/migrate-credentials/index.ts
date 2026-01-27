/**
 * @fileoverview Credential Migration Edge Function
 * @description Migrates existing plaintext credentials to encrypted format
 *
 * This function should be run ONCE after deploying the encryption update.
 * It will:
 * 1. Find all credentials with encryption_version = 0 (plaintext)
 * 2. Encrypt each credential using AES-256-GCM
 * 3. Update the encryption_version to 1
 *
 * Security: This endpoint requires the service role key for authentication.
 *
 * Usage:
 * curl -X POST https://your-project.supabase.co/functions/v1/migrate-credentials \
 *   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
 *   -H "Content-Type: application/json"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptCredential, isEncrypted, ENCRYPTION_VERSION } from '../_shared/crypto.ts';

// CORS headers for local development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: string[];
  details: {
    tenantId: string;
    status: 'migrated' | 'skipped' | 'failed';
    reason?: string;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify service role authentication
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    if (token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check that encryption key is configured
    const encryptionKey = Deno.env.get('MASTER_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'MASTER_ENCRYPTION_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Migration] Starting credential migration...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Fetch all credentials that need migration
    const { data: credentials, error: fetchError } = await supabase
      .from('tenant_credentials')
      .select('*')
      .or('encryption_version.is.null,encryption_version.eq.0');

    if (fetchError) {
      console.error('[Migration] Failed to fetch credentials:', fetchError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch credentials: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: MigrationResult = {
      success: true,
      migrated: 0,
      skipped: 0,
      failed: 0,
      total: credentials?.length ?? 0,
      errors: [],
      details: [],
    };

    console.log(`[Migration] Found ${result.total} credentials to process`);

    // Process each credential
    for (const cred of credentials ?? []) {
      try {
        const updates: Record<string, string | number> = {
          encryption_version: ENCRYPTION_VERSION,
        };
        let needsUpdate = false;

        // Process whatsapp_credential
        if (cred.whatsapp_credential && !isEncrypted(cred.whatsapp_credential)) {
          updates.whatsapp_credential = await encryptCredential(cred.whatsapp_credential);
          needsUpdate = true;
          console.log(`[Migration] Encrypted whatsapp_credential for tenant: ${cred.tenant_id}`);
        }

        // Process calls_credential
        if (cred.calls_credential && !isEncrypted(cred.calls_credential)) {
          updates.calls_credential = await encryptCredential(cred.calls_credential);
          needsUpdate = true;
          console.log(`[Migration] Encrypted calls_credential for tenant: ${cred.tenant_id}`);
        }

        // Process conversations_credential
        if (cred.conversations_credential && !isEncrypted(cred.conversations_credential)) {
          updates.conversations_credential = await encryptCredential(cred.conversations_credential);
          needsUpdate = true;
          console.log(`[Migration] Encrypted conversations_credential for tenant: ${cred.tenant_id}`);
        }

        if (needsUpdate) {
          // Update the credential with encrypted values
          const { error: updateError } = await supabase
            .from('tenant_credentials')
            .update(updates)
            .eq('id', cred.id);

          if (updateError) {
            throw updateError;
          }

          result.migrated++;
          result.details.push({
            tenantId: cred.tenant_id,
            status: 'migrated',
          });
        } else {
          // No plaintext credentials found, just update version
          await supabase
            .from('tenant_credentials')
            .update({ encryption_version: ENCRYPTION_VERSION })
            .eq('id', cred.id);

          result.skipped++;
          result.details.push({
            tenantId: cred.tenant_id,
            status: 'skipped',
            reason: 'No plaintext credentials found',
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push(`Tenant ${cred.tenant_id}: ${errorMessage}`);
        result.details.push({
          tenantId: cred.tenant_id,
          status: 'failed',
          reason: errorMessage,
        });
        console.error(`[Migration] Failed for tenant ${cred.tenant_id}:`, errorMessage);
      }
    }

    result.success = result.failed === 0;

    console.log('[Migration] Migration completed:', {
      migrated: result.migrated,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
    });

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: result.success ? 200 : 207, // 207 Multi-Status if partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Migration] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
