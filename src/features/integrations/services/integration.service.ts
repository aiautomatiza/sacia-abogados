import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserScope } from '@/lib/utils/tenant';
import type { Integration, UpdateSyncSettingsParams } from '../types';

export async function initiateOAuth(integrationName: string, tenantId?: string) {
  // If tenantId is provided (superAdmin case), use it
  // Otherwise get it from user scope (normal user case)
  let effectiveTenantId: string;

  if (tenantId) {
    effectiveTenantId = tenantId;
  } else {
    const scope = await getCurrentUserScope();
    if (!scope.tenantId) {
      throw new Error('No se pudo determinar el tenant. Por favor selecciona un cliente.');
    }
    effectiveTenantId = scope.tenantId;
  }

  // Get session for authorization header
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
  }

  const { data, error } = await supabase.functions.invoke('initiate-oauth', {
    body: {
      integration_name: integrationName,
      tenant_id: effectiveTenantId,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) throw error;

  return data as { authorization_url: string; state: string };
}

export async function getIntegrations(tenantId?: string): Promise<Integration[]> {
  let query = supabase
    .from('integration_credentials')
    .select('*, integration_sync_settings(*)');

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return data as Integration[];
}

export async function getIntegration(integrationId: string): Promise<Integration | null> {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('*, integration_sync_settings(*)')
    .eq('id', integrationId)
    .maybeSingle();

  if (error) throw error;

  return data as Integration | null;
}

export async function disconnectIntegration(integrationId: string) {
  const scope = await getCurrentUserScope();

  // Validar que la integración pertenece al tenant
  const { data: integration } = await supabase
    .from('integration_credentials')
    .select('tenant_id, integration_name')
    .eq('id', integrationId)
    .single();

  if (!integration) {
    throw new Error('Integration not found');
  }

  if (integration.tenant_id !== scope.tenantId) {
    throw new Error('Integration does not belong to your organization');
  }

  // Llamar al middleware para revocar OAuth (si el endpoint existe)
  try {
    const middlewareUrl = import.meta.env.VITE_MIDDLEWARE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (middlewareUrl && session?.access_token) {
      await fetch(`${middlewareUrl}/api/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          integration_id: integrationId,
          tenant_id: scope.tenantId,
          integration_name: integration.integration_name,
        }),
      });
    }
  } catch (error) {
    console.error('Error revoking OAuth in middleware:', error);
    // Continuamos con la eliminación local aunque falle el revoke remoto
  }

  // Eliminar de la base de datos
  const { error } = await supabase
    .from('integration_credentials')
    .delete()
    .eq('id', integrationId);

  if (error) throw error;
}

export async function updateSyncSettings(
  integrationId: string,
  settings: UpdateSyncSettingsParams
) {
  const { data, error } = await supabase
    .from('integration_sync_settings')
    .update(settings)
    .eq('integration_id', integrationId)
    .select()
    .single();

  if (error) throw error;

  return data;
}
