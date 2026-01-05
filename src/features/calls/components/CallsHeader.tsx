/**
 * @fileoverview Calls Header
 * @description Header with title, refresh button, and realtime connection indicator
 */

import { RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CallsHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  isConnected?: boolean;
  isInitializing?: boolean;
}

export function CallsHeader({ 
  onRefresh, 
  isRefreshing = false, 
  isConnected = false,
  isInitializing = false,
}: CallsHeaderProps) {
  // Determine visual state
  const getConnectionState = () => {
    if (isInitializing) {
      return { 
        Icon: Loader2, 
        text: "Conectando...", 
        className: "bg-amber-500/10 text-amber-600",
        tooltip: "Estableciendo conexión en tiempo real...",
        animate: true,
      };
    }
    if (isConnected) {
      return { 
        Icon: Wifi, 
        text: "Conectado", 
        className: "bg-emerald-500/10 text-emerald-600",
        tooltip: "Actualizaciones en tiempo real activas",
        animate: false,
      };
    }
    return { 
      Icon: WifiOff, 
      text: "Desconectado", 
      className: "bg-muted text-muted-foreground",
      tooltip: "Sin conexión en tiempo real",
      animate: false,
    };
  };

  const state = getConnectionState();
  return (
    <PageHeader
      title="Llamadas"
      actions={
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${state.className}`}>
                <state.Icon className={`h-3.5 w-3.5 ${state.animate ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{state.text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{state.tooltip}</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      }
    />
  );
}
