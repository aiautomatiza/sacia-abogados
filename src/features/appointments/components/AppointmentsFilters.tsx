import { useState } from "react";
import { Search, X, Filter, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useActiveLocations } from "@/features/locations";
import { useTenantAgents } from "../hooks/use-tenant-agents";
import type { AppointmentFilters, AppointmentType, AppointmentStatus } from "../types";

interface AppointmentsFiltersProps {
  filters: AppointmentFilters;
  onSearchChange: (search: string) => void;
  onDateFromChange: (date: Date | null) => void;
  onDateToChange: (date: Date | null) => void;
  onTypesChange: (types: AppointmentType[]) => void;
  onStatusesChange: (statuses: AppointmentStatus[]) => void;
  onLocationChange: (locationId: string | null) => void;
  onAgentChange: (agentId: string | null) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isSearchPending?: boolean;
}

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "call", label: "Llamada" },
  { value: "in_person", label: "Presencial" },
];

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "scheduled", label: "Programada" },
  { value: "confirmed", label: "Confirmada" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "No presentado" },
];

export function AppointmentsFilters({
  filters,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onTypesChange,
  onStatusesChange,
  onLocationChange,
  onAgentChange,
  onReset,
  hasActiveFilters,
  isSearchPending,
}: AppointmentsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: locations } = useActiveLocations();
  const { agents } = useTenantAgents();

  return (
    <div className="space-y-4">
      {/* Fila principal de filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por contacto o titulo..."
            value={filters.search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "pl-9",
              isSearchPending && "pr-9"
            )}
          />
          {isSearchPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Fecha desde */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
                !filters.date_from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date_from
                ? format(filters.date_from, "d MMM yyyy", { locale: es })
                : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date_from || undefined}
              onSelect={(date) => onDateFromChange(date || null)}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Fecha hasta */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[180px] justify-start text-left font-normal",
                !filters.date_to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date_to
                ? format(filters.date_to, "d MMM yyyy", { locale: es })
                : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date_to || undefined}
              onSelect={(date) => onDateToChange(date || null)}
              locale={es}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Boton filtros avanzados */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(showAdvanced && "bg-muted")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Activos
            </Badge>
          )}
        </Button>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={filters.types?.[0] || "all"}
              onValueChange={(value) =>
                onTypesChange(value === "all" ? [] : [value as AppointmentType])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filters.statuses?.[0] || "all"}
              onValueChange={(value) =>
                onStatusesChange(
                  value === "all" ? [] : [value as AppointmentStatus]
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sede */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sede</label>
            <Select
              value={filters.location_id || "all"}
              onValueChange={(value) =>
                onLocationChange(value === "all" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sedes</SelectItem>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Comercial</label>
            <Select
              value={filters.agent_id || "all"}
              onValueChange={(value) =>
                onAgentChange(value === "all" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los comerciales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los comerciales</SelectItem>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
