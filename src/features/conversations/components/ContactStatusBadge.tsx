/**
 * @fileoverview Contact Status Badge for Conversations
 * @description Compact badge for displaying contact status in conversation items
 */

import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContactStatus } from '../types';

interface ContactStatusBadgeProps {
  status: ContactStatus | null | undefined;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default';
}

/**
 * ContactStatusBadge - Compact visual badge for contact status
 * Designed for use in conversation list items and headers
 */
export function ContactStatusBadge({
  status,
  className,
  showIcon = true,
  size = 'default'
}: ContactStatusBadgeProps) {
  if (!status) {
    return null; // Don't show anything if no status
  }

  // Dynamically get icon component from Lucide
  const IconComponent = status.icon
    ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
        status.icon as keyof typeof LucideIcons
      ]
    : null;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0 h-5'
    : 'text-xs px-2 py-0.5';

  return (
    <Badge
      variant="outline"
      className={cn('gap-1', sizeClasses, className)}
      style={{
        borderColor: status.color,
        color: status.color,
        backgroundColor: `${status.color}15`,
      }}
    >
      {showIcon && IconComponent && (
        <IconComponent className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      )}
      {status.name}
    </Badge>
  );
}
