/**
 * @fileoverview Secrets management module
 * @description Handles encrypted storage and retrieval of tenant credentials
 *
 * All credentials are encrypted at rest using AES-256-GCM.
 * See crypto.ts for encryption implementation details.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  encryptCredential,
  decryptCredential,
  isEncrypted,
  ENCRYPTION_VERSION
} from './crypto.ts';

type CredentialChannel = 'whatsapp' | 'calls' | 'conversations';

/**
 * Get the column name for a credential channel
 */
function getColumnName(channel: CredentialChannel): string {
  switch (channel) {
    case 'whatsapp':
      return 'whatsapp_credential';
    case 'calls':
      return 'calls_credential';
    case 'conversations':
      return 'conversations_credential';
  }
}

/**
 * Store an encrypted credential for a tenant
 *
 * @param tenantId - The tenant ID
 * @param channel - The credential channel (whatsapp, calls, conversations)
 * @param credential - The plaintext credential to store (will be encrypted)
 */
export async function storeCredential(
  tenantId: string,
  channel: CredentialChannel,
  credential: string
): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const columnName = getColumnName(channel);

  // Encrypt the credential before storing
  const encryptedCredential = await encryptCredential(credential);

  const { error } = await supabaseAdmin
    .from('tenant_credentials')
    .upsert(
      {
        tenant_id: tenantId,
        [columnName]: encryptedCredential,
        encryption_version: ENCRYPTION_VERSION,
      },
      {
        onConflict: 'tenant_id',
      }
    );

  if (error) {
    console.error('[Secrets] Failed to store credential:', error);
    throw error;
  }

  console.log(`[Secrets] Credential stored for tenant ${tenantId}, channel: ${channel}`);
}

/**
 * Retrieve and decrypt a credential for a tenant
 *
 * @param tenantId - The tenant ID
 * @param channel - The credential channel (whatsapp, calls, conversations)
 * @returns The decrypted credential, or null if not found
 */
export async function getCredential(
  tenantId: string,
  channel: CredentialChannel
): Promise<string | null> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: creds, error } = await supabaseAdmin
    .from('tenant_credentials')
    .select('whatsapp_credential, calls_credential, conversations_credential')
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('[Secrets] Failed to fetch credential:', error);
    throw error;
  }

  if (!creds) return null;

  const encryptedValue =
    channel === 'whatsapp'
      ? creds.whatsapp_credential
      : channel === 'calls'
        ? creds.calls_credential
        : creds.conversations_credential;

  if (!encryptedValue) return null;

  // Decrypt before returning
  try {
    const decrypted = await decryptCredential(encryptedValue);
    return decrypted;
  } catch (error) {
    console.error('[Secrets] Failed to decrypt credential:', error);
    // Return null on decryption failure (key rotation, corrupted data, etc.)
    return null;
  }
}

/**
 * Check if a tenant has any credentials stored
 */
export async function hasCredentials(tenantId: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabaseAdmin
    .from('tenant_credentials')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Secrets] Failed to check credentials:', error);
    throw error;
  }

  return !!data;
}

/**
 * Delete all credentials for a tenant
 */
export async function deleteCredentials(tenantId: string): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error } = await supabaseAdmin
    .from('tenant_credentials')
    .delete()
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[Secrets] Failed to delete credentials:', error);
    throw error;
  }

  console.log(`[Secrets] Credentials deleted for tenant ${tenantId}`);
}

// Re-export encryption utilities for use in other modules
export { isEncrypted, encryptCredential, decryptCredential } from './crypto.ts';
