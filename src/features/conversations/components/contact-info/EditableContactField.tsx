/**
 * @fileoverview Editable Contact Field Component - ADAPTADO PARA TENANT-BASED
 * @description Inline editable field with validation and save functionality
 *
 * CAMBIOS vs original:
 * - Ninguno (componente genérico sin referencias específicas)
 * - Compatible con campos dinámicos en attributes
 */

import React, { useState, useEffect } from "react";
import { Edit, Check, X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EditableContactFieldProps {
  label: string;
  value: string | number | null | undefined;
  type: "text" | "phone" | "email" | "select" | "date" | "number";
  options?: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
  onSave: (value: any) => Promise<void>;
  formatDisplay?: (value: any) => string;
  disabled?: boolean;
  placeholder?: string;
}

export function EditableContactField({
  label,
  value,
  type,
  options,
  icon,
  onSave,
  formatDisplay,
  disabled = false,
  placeholder = "—",
}: EditableContactFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      toast({
        title: "Campo actualizado",
        description: `${label} actualizado correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo actualizar el campo",
        variant: "destructive",
      });
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const displayValue = formatDisplay ? formatDisplay(value) : value || placeholder;

  return (
    <div className="group space-y-1">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        <span>{label}</span>
      </div>

      {!isEditing ? (
        // Display mode
        <button
          onClick={() => !disabled && setIsEditing(true)}
          disabled={disabled}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm",
            "transition-colors duration-150",
            disabled ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "hover:bg-muted/50 cursor-pointer",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>{displayValue}</span>
            {!disabled && (
              <Edit className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </button>
      ) : (
        // Edit mode
        <div className="space-y-2">
          {type === "select" ? (
            <Select value={(editValue as string) || ""} onValueChange={setEditValue}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : type === "date" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left h-9 font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editValue ? format(new Date(editValue as string), "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editValue ? new Date(editValue as string) : undefined}
                  onSelect={(date) => setEditValue(date?.toISOString())}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          ) : type === "number" ? (
            <Input
              type="number"
              value={editValue || ""}
              onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          ) : (
            <Input
              type={type}
              value={editValue || ""}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 h-8">
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Guardar
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="h-8">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
