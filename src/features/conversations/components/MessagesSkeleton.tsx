/**
 * @fileoverview Messages Skeleton Component - TIER S UX
 * @description Skeleton loading state para el panel de mensajes
 * @performance Muestra feedback visual inmediato mientras cargan los mensajes
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MessagesSkeletonProps {
  /** Cantidad de mensajes skeleton a mostrar */
  count?: number;
  /** Clase adicional para el contenedor */
  className?: string;
}

/**
 * Componente skeleton para simular la carga de mensajes
 * Alterna entre mensajes propios (derecha) y de contacto (izquierda)
 */
export function MessagesSkeleton({ count = 8, className }: MessagesSkeletonProps) {
  return (
    <div className={cn("flex-1 p-4 space-y-4 overflow-hidden", className)}>
      {/* Date separator skeleton */}
      <div className="flex justify-center">
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* Message skeletons */}
      {Array.from({ length: count }).map((_, index) => {
        // Alternar entre mensaje propio (derecha) y de contacto (izquierda)
        const isOwnMessage = index % 3 === 0;
        // Variar el ancho de los mensajes para mayor realismo
        const widthClass = index % 4 === 0 ? "w-2/3" : index % 3 === 0 ? "w-1/2" : "w-3/5";

        return (
          <div
            key={index}
            className={cn(
              "flex gap-2",
              isOwnMessage ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar (solo para mensajes de contacto) */}
            {!isOwnMessage && (
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            )}

            {/* Mensaje bubble */}
            <div
              className={cn(
                "space-y-2",
                widthClass,
                isOwnMessage ? "items-end" : "items-start"
              )}
            >
              <Skeleton
                className={cn(
                  "h-16 rounded-lg",
                  isOwnMessage ? "rounded-br-sm" : "rounded-bl-sm"
                )}
              />
              {/* Timestamp */}
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        );
      })}

      {/* Segundo date separator para variedad */}
      {count > 4 && (
        <div className="flex justify-center">
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      )}

      {/* Más mensajes después del separator */}
      {count > 4 &&
        Array.from({ length: Math.min(3, count - 5) }).map((_, index) => {
          const isOwnMessage = (index + 1) % 2 === 0;
          const widthClass = index % 2 === 0 ? "w-1/2" : "w-2/5";

          return (
            <div
              key={`extra-${index}`}
              className={cn(
                "flex gap-2",
                isOwnMessage ? "flex-row-reverse" : "flex-row"
              )}
            >
              {!isOwnMessage && (
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              )}
              <div className={cn("space-y-2", widthClass)}>
                <Skeleton
                  className={cn(
                    "h-12 rounded-lg",
                    isOwnMessage ? "rounded-br-sm" : "rounded-bl-sm"
                  )}
                />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          );
        })}
    </div>
  );
}

/**
 * Skeleton compacto para usar en espacios más pequeños
 */
export function MessagesSkeletonCompact() {
  return (
    <div className="flex-1 p-4 space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex gap-2",
            index % 2 === 0 ? "flex-row" : "flex-row-reverse"
          )}
        >
          {index % 2 === 0 && (
            <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          )}
          <Skeleton className="h-10 w-1/2 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
