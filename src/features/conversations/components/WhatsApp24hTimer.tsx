/**
 * @fileoverview WhatsApp 24h Timer Component - ADAPTADO PARA TENANT-BASED
 * @description Display remaining time in 24h window
 *
 * CAMBIOS vs original:
 * - Ninguno (componente simple sin referencias a clinic/account)
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { useWhatsAppWindow } from "../hooks/useWhatsAppWindow";

interface Props {
  expiresAt: string | null;
}

export function WhatsApp24hTimer({ expiresAt }: Props) {
  const { hasWindow, hoursRemaining, minutesRemaining, isExpired } = useWhatsAppWindow(expiresAt);

  // Si no hay expiresAt, mostrar mensaje indicando que no hay ventana activa
  if (!expiresAt) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          La ventana de 24h ha expirado. Solo puedes enviar plantillas pre-aprobadas.
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpired) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          La ventana de 24h ha expirado. Solo puedes enviar plantillas pre-aprobadas.
        </AlertDescription>
      </Alert>
    );
  }

  // Warning when less than 2 hours remaining
  const isWarning = hoursRemaining < 2;

  return (
    <Alert variant={isWarning ? "default" : "default"} className={isWarning ? "border-orange-500/50" : ""}>
      <Clock className="h-4 w-4" />
      <AlertDescription className="text-xs">
        {isWarning && <span className="font-medium text-orange-600 dark:text-orange-400">⚠️ Quedan pocas horas: </span>}
        <span>
          Ventana de 24h activa: {hoursRemaining}h {minutesRemaining}m restantes
        </span>
      </AlertDescription>
    </Alert>
  );
}
