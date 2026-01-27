import { Plus, RefreshCw, Table2, CalendarDays, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AppointmentView } from "../hooks/use-appointments-url-state";

interface AppointmentsHeaderProps {
  view: AppointmentView;
  onViewChange: (view: AppointmentView) => void;
  onCreateClick: () => void;
  onRefresh: () => void;
  isConnected?: boolean;
  isRefreshing?: boolean;
}

export function AppointmentsHeader({
  view,
  onViewChange,
  onCreateClick,
  onRefresh,
  isConnected = true,
  isRefreshing = false,
}: AppointmentsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Citas</h1>
        <p className="text-muted-foreground">
          Gestiona tus citas de llamadas y presenciales
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Indicador de conexion realtime */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs",
                  isConnected
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                )}
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">
                  {isConnected ? "En vivo" : "Desconectado"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isConnected
                ? "Actualizaciones en tiempo real activas"
                : "Sin conexion en tiempo real"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Selector de vista */}
        <Tabs value={view} onValueChange={(v) => onViewChange(v as AppointmentView)}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1">
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tabla</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Boton refresh */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualizar datos</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Boton crear */}
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva cita
        </Button>
      </div>
    </div>
  );
}
