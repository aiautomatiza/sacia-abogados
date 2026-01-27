import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarView } from "../../hooks/use-appointments-calendar";

interface CalendarHeaderProps {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday?: boolean;
}

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
  { value: "agenda", label: "Agenda" },
];

export function CalendarHeader({
  title,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  isToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
      {/* Navegación */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          title="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onToday}
          disabled={isToday}
          className="ml-2"
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Hoy
        </Button>
      </div>

      {/* Título */}
      <h2 className="text-lg font-semibold capitalize text-center flex-1">
        {title}
      </h2>

      {/* Selector de vista */}
      <Select value={view} onValueChange={(v) => onViewChange(v as CalendarView)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
