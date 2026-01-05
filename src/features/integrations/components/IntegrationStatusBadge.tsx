import { Badge } from '@/components/ui/badge';

interface IntegrationStatusBadgeProps {
  status?: string;
}

export function IntegrationStatusBadge({ status }: IntegrationStatusBadgeProps) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Activa', variant: 'default' },
    pending: { label: 'Pendiente', variant: 'secondary' },
    expired: { label: 'Expirada', variant: 'destructive' },
    error: { label: 'Error', variant: 'destructive' },
  };

  const config = variants[status || 'pending'] || variants.pending;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
