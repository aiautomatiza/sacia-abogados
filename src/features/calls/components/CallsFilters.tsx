/**
 * @fileoverview Calls Filters
 * @description Filter component for calls
 */

import { useState } from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CallFilters, CallState, CallType } from "../types/call.types";
import { formatCallState, formatCallType } from "../utils/call-formatters";

interface CallsFiltersProps {
  filters: CallFilters;
  onSearchChange: (search: string) => void;
  onDateRangeChange: (from: Date | null, to: Date | null) => void;
  onStatesChange: (states: CallState[]) => void;
  onTypesChange: (types: CallType[]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const ALL_STATES: CallState[] = [
  "pending",
  "completed",
  "failed",
  "missed",
  "voicemail",
  "user_hangup",
  "scheduled",
];

const ALL_TYPES: CallType[] = ["inbound", "outbound"];

export function CallsFilters({
  filters,
  onSearchChange,
  onDateRangeChange,
  onStatesChange,
  onTypesChange,
  onReset,
  hasActiveFilters,
}: CallsFiltersProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [stateFilterOpen, setStateFilterOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);

  const handleStateToggle = (state: CallState) => {
    const currentStates = filters.states || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter((s) => s !== state)
      : [...currentStates, state];
    onStatesChange(newStates);
  };

  const handleTypeToggle = (type: CallType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onTypesChange(newTypes);
  };

  const formatDateRange = () => {
    if (!filters.date_from && !filters.date_to) return null;
    if (filters.date_from && filters.date_to) {
      return `${format(filters.date_from, "dd/MM/yy")} - ${format(filters.date_to, "dd/MM/yy")}`;
    }
    if (filters.date_from) {
      return `Desde ${format(filters.date_from, "dd/MM/yy")}`;
    }
    return `Hasta ${format(filters.date_to!, "dd/MM/yy")}`;
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={filters.search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Date Range Filter */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                (filters.date_from || filters.date_to) && "border-primary"
              )}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {formatDateRange() || "Fechas"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Desde</Label>
                <CalendarComponent
                  mode="single"
                  selected={filters.date_from || undefined}
                  onSelect={(date) => onDateRangeChange(date || null, filters.date_to)}
                  locale={es}
                  className="pointer-events-auto"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hasta</Label>
                <CalendarComponent
                  mode="single"
                  selected={filters.date_to || undefined}
                  onSelect={(date) => onDateRangeChange(filters.date_from, date || null)}
                  locale={es}
                  className="pointer-events-auto"
                />
              </div>
              {(filters.date_from || filters.date_to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onDateRangeChange(null, null);
                    setDatePickerOpen(false);
                  }}
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* State Filter */}
        <Popover open={stateFilterOpen} onOpenChange={setStateFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                filters.states && filters.states.length > 0 && "border-primary"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Estado
              {filters.states && filters.states.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.states.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">Filtrar por estado</p>
              {ALL_STATES.map((state) => (
                <div key={state} className="flex items-center space-x-2">
                  <Checkbox
                    id={`state-${state}`}
                    checked={(filters.states || []).includes(state)}
                    onCheckedChange={() => handleStateToggle(state)}
                  />
                  <Label
                    htmlFor={`state-${state}`}
                    className="text-sm cursor-pointer"
                  >
                    {formatCallState(state)}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Type Filter */}
        <Popover open={typeFilterOpen} onOpenChange={setTypeFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                filters.types && filters.types.length > 0 && "border-primary"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Tipo
              {filters.types && filters.types.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.types.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3">Filtrar por tipo</p>
              {ALL_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={(filters.types || []).includes(type)}
                    onCheckedChange={() => handleTypeToggle(type)}
                  />
                  <Label
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer"
                  >
                    {formatCallType(type)}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onSearchChange("")}
              />
            </Badge>
          )}
          {(filters.date_from || filters.date_to) && (
            <Badge variant="secondary" className="gap-1">
              {formatDateRange()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onDateRangeChange(null, null)}
              />
            </Badge>
          )}
          {filters.states?.map((state) => (
            <Badge key={state} variant="secondary" className="gap-1">
              {formatCallState(state)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStateToggle(state)}
              />
            </Badge>
          ))}
          {filters.types?.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              {formatCallType(type)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTypeToggle(type)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
