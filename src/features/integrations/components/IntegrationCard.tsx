import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { SyncButton } from './SyncButton';
import { useIntegrationMutations } from '../hooks/useIntegrationMutations';

interface IntegrationCardProps {
  integration: {
    id?: string;
    integration_name: string;
    integration_type: string;
    status?: string;
    last_sync_at?: string;
  };
  connected?: boolean;
}

export function IntegrationCard({ integration, connected }: IntegrationCardProps) {
  const { connectIntegration, disconnect } = useIntegrationMutations();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="capitalize">{integration.integration_name}</CardTitle>
            <CardDescription className="capitalize">{integration.integration_type}</CardDescription>
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
            onClick={() => connectIntegration.mutate(integration.integration_name)}
            disabled={connectIntegration.isPending}
          >
            Conectar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
