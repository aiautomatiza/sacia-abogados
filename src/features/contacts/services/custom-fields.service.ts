import { supabase } from '@/integrations/supabase/client';
import { getCurrentTenantId } from '@/lib/utils/tenant';
import type { CustomField } from '../types';

async function getTenantId(tenantIdOverride?: string): Promise<string> {
  if (tenantIdOverride) {
    return tenantIdOverride;
  }

  return await getCurrentTenantId();
}

export async function getCustomFields(tenantIdOverride?: string): Promise<CustomField[]> {
  // SECURITY: Always require tenant_id to prevent data leakage
  const tenantId = await getTenantId(tenantIdOverride);

  const { data, error } = await supabase
    .from('custom_fields')
    .select('*')
    .eq('tenant_id', tenantId)  // CRITICAL: Always filter by tenant
    .order('display_order', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    ...row,
    field_type: row.field_type as CustomField['field_type'],
    options: (row.options as any) || [],
  }));
}

export async function createCustomField(
  field: Omit<CustomField, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>,
  tenantIdOverride?: string
): Promise<CustomField> {
  const tenantId = await getTenantId(tenantIdOverride);

  const { data, error } = await supabase
    .from('custom_fields')
    .insert({ ...field, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    field_type: data.field_type as CustomField['field_type'],
    options: (data.options as any) || [],
  };
}

export async function updateCustomField(
  id: string,
  updates: Partial<CustomField>,
  tenantIdOverride?: string
): Promise<CustomField> {
  // SECURITY: Validate tenant ownership before update
  const tenantId = await getTenantId(tenantIdOverride);

  const { data, error } = await supabase
    .from('custom_fields')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)  // CRITICAL: Ensure tenant ownership
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    field_type: data.field_type as CustomField['field_type'],
    options: (data.options as any) || [],
  };
}

export async function deleteCustomField(id: string, tenantIdOverride?: string): Promise<void> {
  // SECURITY: Validate tenant ownership before delete
  const tenantId = await getTenantId(tenantIdOverride);

  const { error } = await supabase
    .from('custom_fields')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);  // CRITICAL: Ensure tenant ownership

  if (error) throw error;
}

export async function reorderFields(
  fields: { id: string; display_order: number }[],
  tenantIdOverride?: string
): Promise<void> {
  // SECURITY: Validate tenant ownership before reordering
  const tenantId = await getTenantId(tenantIdOverride);

  const updates = fields.map(field =>
    supabase
      .from('custom_fields')
      .update({ display_order: field.display_order })
      .eq('id', field.id)
      .eq('tenant_id', tenantId)  // CRITICAL: Ensure tenant ownership
  );

  await Promise.all(updates);
}
