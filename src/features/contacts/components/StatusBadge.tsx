/**
 * @fileoverview Status Badge Component
 * @description Visual badge for displaying contact status with color and icon
 */

import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContactStatus } from '../types';

interface StatusBadgeProps {
  status: ContactStatus | null | undefined;
  className?: string;
  showIcon?: boolean;
}

/**
 * StatusBadge - Visual badge for contact status
 *
 * @param status - Contact status object (or null for "Sin estado")
 * @param className - Additional CSS classes
 * @param showIcon - Whether to show icon (default: true)
 *
 * @example
 * <StatusBadge status={contactStatus} />
 * <StatusBadge status={null} /> // Shows "Sin estado"
 * <StatusBadge status={status} showIcon={false} className="text-sm" />
 */
export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        Sin estado
      </Badge>
    );
  }

  // Dynamically get icon component from Lucide
  const IconComponent = status.icon
    ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
        status.icon as keyof typeof LucideIcons
      ]
    : null;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5', className)}
      style={{
        borderColor: status.color,
        color: status.color,
        backgroundColor: `${status.color}10`, // 10% opacity background
      }}
    >
      {showIcon && IconComponent && <IconComponent className="h-3 w-3" />}
      {status.name}
    </Badge>
  );
}
