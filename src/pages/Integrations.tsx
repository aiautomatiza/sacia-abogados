import { useEffect } from 'react';
import { IntegrationCard } from '@/features/integrations/components/IntegrationCard';
import { SyncHistoryTable } from '@/features/integrations/components/SyncHistoryTable';
import { useIntegrations } from '@/features/integrations/hooks/useIntegrations';
import { useOAuthCallback } from '@/features/integrations/hooks/useOAuthCallback';
import { useRealtime } from '@/hooks/use-realtime';
import { useProfile } from '@/hooks/useProfile';

export default function Integrations() {
  const { data: integrations, isLoading } = useIntegrations();
  const { profile } = useProfile();

  // Manejar callback OAuth si viene en la URL
  // (por si el usuario aterriza directamente aquí en vez de /oauth/callback)
  const { hasOAuthParams, isProcessing: isProcessingCallback } = useOAuthCallback({
    redirectTo: '/admin/integrations',
    autoProcess: true,
  });

  // Realtime updates para integrations y sync logs
  useRealtime({
    subscriptions: [
      {
        table: 'integration_credentials',
        event: '*',
        filter: profile?.tenant_id ? `tenant_id=eq.${profile.tenant_id}` : undefined,
        queryKeysToInvalidate: [['integrations', profile?.tenant_id]],
      },
      {
        table: 'sync_logs',
        event: '*',
        filter: profile?.tenant_id ? `tenant_id=eq.${profile.tenant_id}` : undefined,
        queryKeysToInvalidate: [['sync-logs', profile?.tenant_id]],
      },
    ],
    enabled: !!profile?.tenant_id,
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

  // Integraciones disponibles (esto podría venir de una configuración)
  const availableIntegrations = [
    { integration_name: 'zoho', integration_type: 'crm' },
    { integration_name: 'salesforce', integration_type: 'crm' },
    { integration_name: 'hubspot', integration_type: 'crm' },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground mt-2">
          Conecta tu software de gestión para sincronizar datos automáticamente
        </p>
      </div>

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
                />
              );
            })}
          </div>

          {integrations && integrations.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Historial de Sincronización</h2>
              <SyncHistoryTable />
            </div>
          )}
        </>
      )}
    </div>
  );
}
