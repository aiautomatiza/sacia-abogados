import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function storeCredential(
  tenantId: string,
  channel: 'whatsapp' | 'calls' | 'conversations',
  credential: string
): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const columnName =
    channel === 'whatsapp' ? 'whatsapp_credential' :
    channel === 'calls' ? 'calls_credential' :
    'conversations_credential';
  
  const { error } = await supabaseAdmin
    .from('tenant_credentials')
    .upsert({
      tenant_id: tenantId,
      [columnName]: credential,
    }, {
      onConflict: 'tenant_id'
    });

  if (error) throw error;
}

export async function getCredential(
  tenantId: string,
  channel: 'whatsapp' | 'calls' | 'conversations'
): Promise<string | null> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: creds } = await supabaseAdmin
    .from('tenant_credentials')
    .select('whatsapp_credential, calls_credential, conversations_credential')
    .eq('tenant_id', tenantId)
    .single();

  if (!creds) return null;

  return channel === 'whatsapp'
    ? creds.whatsapp_credential
    : channel === 'calls'
    ? creds.calls_credential
    : creds.conversations_credential;
}
