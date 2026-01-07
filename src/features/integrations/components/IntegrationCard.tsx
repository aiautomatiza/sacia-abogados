import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { SyncButton } from './SyncButton';
import { useIntegrationMutations } from '../hooks/useIntegrationMutations';
import { getIntegrationConfig } from '../constants/integration-config';

interface IntegrationCardProps {
  integration: {
    id?: string;
    integration_name: string;
    integration_type: string;
    status?: string;
    last_sync_at?: string;
  };
  connected?: boolean;
  tenantId?: string;
}

export function IntegrationCard({ integration, connected, tenantId }: IntegrationCardProps) {
  const { connectIntegration, disconnect } = useIntegrationMutations();
  const config = getIntegrationConfig(integration.integration_name);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config?.logo && (
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg border border-gray-200 p-2 flex-shrink-0">
                <img
                  src={config.logo}
                  alt={`${config.displayName} logo`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback si la imagen no carga
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div>
              <CardTitle className="capitalize">
                {config?.displayName || integration.integration_name}
              </CardTitle>
              <CardDescription>
                {config?.description || integration.integration_type}
              </CardDescription>
            </div>
          </div>
          {connected && <IntegrationStatusBadge status={integration.status} />}
        </div>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="space-y-3">
            {integration.last_sync_at && (
              <p className="text-sm text-muted-foreground">
                Última sincronización: {new Date(integration.last_sync_at).toLocaleString()}
              </p>
            )}
            <div className="flex gap-2">
              <SyncButton integrationId={integration.id!} />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnect.mutate(integration.id!)}
                disabled={disconnect.isPending}
              >
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => connectIntegration.mutate({ integrationName: integration.integration_name, tenantId })}
            disabled={connectIntegration.isPending}
          >
            Conectar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
