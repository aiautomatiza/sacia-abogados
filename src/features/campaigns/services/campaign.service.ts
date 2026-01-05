import { supabase } from '@/integrations/supabase/client';
import { getCurrentTenantId } from '@/lib/utils/tenant';
import type { Campaign, CampaignFilters, CampaignBatch, CampaignContact, CampaignContactWithBatch } from '../types';

export async function getCampaigns(
  filters: CampaignFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: Campaign[]; total: number }> {
  const tenantId = await getCurrentTenantId();

  let query = supabase
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data || []).map(c => ({
      ...c,
      channel: c.channel as 'whatsapp' | 'llamadas',
      status: c.status as Campaign['status'],
    })),
    total: count || 0,
  };
}

export async function getCampaign(id: string): Promise<Campaign> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) throw error;
  return {
    ...data,
    channel: data.channel as 'whatsapp' | 'llamadas',
    status: data.status as Campaign['status'],
  };
}

export async function getCampaignBatches(campaignId: string): Promise<CampaignBatch[]> {
  const { data, error } = await supabase
    .from('campaign_queue')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('batch_number', { ascending: true });

  if (error) throw error;
  return (data || []).map(b => ({
    ...b,
    status: b.status as CampaignBatch['status'],
    contacts: b.contacts as any as CampaignContact[],
  }));
}

export async function getCampaignContacts(campaignId: string): Promise<CampaignContactWithBatch[]> {
  const batches = await getCampaignBatches(campaignId);
  
  return batches.flatMap((batch) => 
    (batch.contacts as any[]).map((contact: any) => ({
      id: contact.id,
      nombre: contact.nombre || null,
      numero: contact.numero,
      attributes: contact.attributes || {},
      batch_number: batch.batch_number,
      batch_status: batch.status,
      sent_at: batch.processed_at,
    }))
  );
}
