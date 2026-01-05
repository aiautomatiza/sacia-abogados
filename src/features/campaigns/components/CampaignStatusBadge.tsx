import { Badge } from '@/components/ui/badge';
import { Clock, Loader, CheckCircle, XCircle } from 'lucide-react';
import type { Campaign } from '../types';

interface CampaignStatusBadgeProps {
  status: Campaign['status'];
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = {
    pending: {
      label: 'Pendiente',
      icon: Clock,
      variant: 'secondary' as const,
      className: undefined,
    },
    in_progress: {
      label: 'En Progreso',
      icon: Loader,
      variant: 'default' as const,
      className: undefined,
    },
    completed: {
      label: 'Completada',
      icon: CheckCircle,
      variant: 'outline' as const,
      className: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400',
    },
    failed: {
      label: 'Fallida',
      icon: XCircle,
      variant: 'destructive' as const,
      className: undefined,
    },
  };

  const { label, icon: Icon, variant, className } = config[status];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
