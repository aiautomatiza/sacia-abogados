import { useMemo, useState, useEffect } from 'react';
import { IntegrationCard } from '@/features/integrations/components/IntegrationCard';
import { SyncHistoryTable } from '@/features/integrations/components/SyncHistoryTable';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrations';
import { useOAuthCallback } from '@/features/integrations/hooks/useOAuthCallback';
import { useRealtime } from '@/hooks/use-realtime';
import { useProfile } from '@/hooks/useProfile';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Tenant {
  id: string;
  name: string;
}

export default function Integrations() {
  const { profile } = useProfile();
  const { isSuperAdmin } = useRole();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Para superAdmins: usar el tenant seleccionado, para usuarios normales: usar su tenant_id
  const effectiveTenantId = isSuperAdmin ? selectedTenantId : profile?.tenant_id;

  const { data: integrations, isLoading } = useIntegrations(effectiveTenantId);

  // Cargar lista de tenants para superAdmins
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchTenants = async () => {
        setLoadingTenants(true);
        try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id, name')
            .eq('status', 'active')
            .order('name');

          if (error) throw error;
          setTenants(data || []);

          // Seleccionar automáticamente el primer tenant si hay
          if (data && data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(data[0].id);
          }
        } catch (error) {
          console.error('Error loading tenants:', error);
        } finally {
          setLoadingTenants(false);
        }
      };

      fetchTenants();
    }
  }, [isSuperAdmin, selectedTenantId]);

  // Manejar callback OAuth si viene en la URL
  const { hasOAuthParams, isProcessing: isProcessingCallback } = useOAuthCallback({
    redirectTo: '/admin/integrations',
    autoProcess: true,
  });

  // Memoize subscriptions to prevent infinite realtime loops
  const realtimeSubscriptions = useMemo(() => [
    {
      table: 'integration_credentials',
      event: '*' as const,
      filter: effectiveTenantId ? `tenant_id=eq.${effectiveTenantId}` : undefined,
      queryKeysToInvalidate: [['integrations', effectiveTenantId]],
    },
    {
      table: 'sync_logs',
      event: '*' as const,
      filter: effectiveTenantId ? `tenant_id=eq.${effectiveTenantId}` : undefined,
      queryKeysToInvalidate: [['sync-logs', effectiveTenantId]],
    },
  ], [effectiveTenantId]);

  // Realtime updates para integrations y sync logs
  useRealtime({
    subscriptions: realtimeSubscriptions,
    enabled: !!effectiveTenantId,
    debounceMs: 1000,
  });

  // Mostrar loading mientras se procesa el callback OAuth
  if (isProcessingCallback) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">Procesando conexión OAuth...</div>
      </div>
    );
  }

  // Integraciones disponibles - Solo PipeDrive
  const availableIntegrations = [
    { integration_name: 'pipedrive', integration_type: 'crm' },
  ];

  // Mostrar mensaje si superAdmin no ha seleccionado tenant
  if (isSuperAdmin && !selectedTenantId && !loadingTenants) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {tenants.length === 0
              ? 'No hay clientes activos. Crea un cliente primero.'
              : 'Selecciona un cliente para gestionar sus integraciones.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground mt-2">
          Conecta tu software de gestión para sincronizar datos automáticamente
        </p>
      </div>

      {/* Selector de tenant para superAdmins */}
      {isSuperAdmin && (
        <div className="max-w-md">
          <Label htmlFor="tenant-select">Cliente</Label>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger id="tenant-select" className="mt-2">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Cargando integraciones...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations.map((available) => {
              const connected = integrations?.find(
                (i) => i.integration_name === available.integration_name
              );

              return (
                <IntegrationCard
                  key={available.integration_name}
                  integration={connected || available}
                  connected={!!connected}
                  tenantId={effectiveTenantId}
                />
              );
            })}
          </div>

          {integrations && integrations.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Historial de Sincronización</h2>
              <SyncHistoryTable tenantId={effectiveTenantId} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
