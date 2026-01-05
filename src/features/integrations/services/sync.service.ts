import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserScope } from '@/lib/utils/tenant';
import type { SyncContactsParams, SyncLog } from '../types';

export async function syncContacts(params: SyncContactsParams) {
  const scope = await getCurrentUserScope();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.functions.invoke('sync-contacts', {
    body: {
      integration_id: params.integrationId,
      tenant_id: scope.tenantId,
      filters: params.filters,
    },
    headers: {
      'x-user-id': user?.id || '',
    },
  });

  if (error) throw error;

  return data as { success: boolean; sync_log_id: string; processed: number; failed: number };
}

export async function getSyncLogs(integrationId?: string, page = 1, pageSize = 20) {
  const scope = await getCurrentUserScope();

  let query = supabase
    .from('sync_logs')
    .select('*, integration_credentials(integration_name)', { count: 'exact' })
    .eq('tenant_id', scope.tenantId)
    .order('created_at', { ascending: false });

  if (integrationId) {
    query = query.eq('integration_id', integrationId);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data as SyncLog[],
    total: count || 0,
  };
}

export async function getSyncLog(syncLogId: string) {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*, integration_credentials(integration_name, integration_type)')
    .eq('id', syncLogId)
    .single();

  if (error) throw error;

  return data as SyncLog;
}
