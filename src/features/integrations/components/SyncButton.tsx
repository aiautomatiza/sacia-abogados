import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncMutations } from '../hooks/useSyncMutations';

interface SyncButtonProps {
  integrationId: string;
}

export function SyncButton({ integrationId }: SyncButtonProps) {
  const { sync } = useSyncMutations();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => sync.mutate({ integrationId })}
      disabled={sync.isPending}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${sync.isPending ? 'animate-spin' : ''}`} />
      {sync.isPending ? 'Sincronizando...' : 'Sincronizar ahora'}
    </Button>
  );
}
