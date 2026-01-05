/**
 * @fileoverview Conversations Skeleton Loader
 * @description Skeleton loading state para lista de conversaciones
 * @performance Visible en < 100ms, previene flash de contenido vacío
 */

import { Skeleton } from '@/components/ui/skeleton';

interface ConversationsSkeletonProps {
  count?: number;
}

export function ConversationsSkeleton({ count = 10 }: ConversationsSkeletonProps) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 border-b">
          <div className="flex gap-3">
            {/* Avatar skeleton */}
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              {/* Name + Time row */}
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>

              {/* Message preview */}
              <Skeleton className="h-3 w-full" />

              {/* Badges row */}
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
