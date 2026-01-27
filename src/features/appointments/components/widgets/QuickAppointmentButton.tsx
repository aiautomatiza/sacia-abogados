/**
 * @fileoverview Quick Appointment Button
 * @description Botón para crear cita rápidamente desde cualquier contexto.
 */

import { useState } from "react";
import { CalendarPlus, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppointmentFormDialog } from "../AppointmentFormDialog";
import type { AppointmentType } from "../../types";

interface QuickAppointmentButtonProps {
  contactId: string;
  contactName?: string | null;
  contactPhone?: string | null;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  onSuccess?: () => void;
}

export function QuickAppointmentButton({
  contactId,
  contactName,
  contactPhone,
  variant = "outline",
  size = "sm",
  showLabel = false,
  onSuccess,
}: QuickAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);

  const handleTypeSelect = (type: AppointmentType) => {
    setSelectedType(type);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
  };

  const handleSuccess = () => {
    handleClose();
    onSuccess?.();
  };

  return (
    <>
      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size}>
                  <CalendarPlus className="h-4 w-4" />
                  {showLabel && <span className="ml-2">Programar cita</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {!showLabel && (
              <TooltipContent>Programar cita</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleTypeSelect("call")}>
            <Phone className="h-4 w-4 mr-2" />
            Cita de llamada
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeSelect("in_person")}>
            <MapPin className="h-4 w-4 mr-2" />
            Cita presencial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de formulario */}
      {selectedType && (
        <AppointmentFormDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
          preSelectedContactId={contactId}
          preSelectedContactName={contactName}
          preSelectedContactPhone={contactPhone}
        />
      )}
    </>
  );
}
