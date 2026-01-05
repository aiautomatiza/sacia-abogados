/**
 * @fileoverview Message Status Component - ADAPTADO PARA TENANT-BASED
 * @description Display delivery status with icons and tooltips
 *
 * CAMBIOS vs original:
 * - Ninguno (componente simple sin referencias a clinic/account)
 */

import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MessageDeliveryStatus } from "../types";

interface Props {
  status: MessageDeliveryStatus;
}

const STATUS_CONFIG: Record<
  MessageDeliveryStatus,
  {
    icon: typeof Check;
    label: string;
    className: string;
  }
> = {
  sending: {
    icon: Clock,
    label: "Enviando...",
    className: "opacity-70",
  },
  sent: {
    icon: Check,
    label: "Enviado",
    className: "opacity-70",
  },
  delivered: {
    icon: CheckCheck,
    label: "Entregado",
    className: "opacity-70",
  },
  read: {
    icon: CheckCheck,
    label: "Leído",
    className: "opacity-90",
  },
  failed: {
    icon: AlertCircle,
    label: "Error al enviar",
    className: "text-destructive opacity-90",
  },
};

export function MessageStatus({ status }: Props) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Icon className={`h-3.5 w-3.5 ${config.className}`} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
