import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppNumbers, useDefaultWhatsAppNumber } from "../hooks/useWhatsAppNumbers";
import { Phone } from "lucide-react";
import { useEffect } from "react";

interface WhatsAppNumberSelectorProps {
  value?: string;
  onChange: (whatsappNumberId: string) => void;
  disabled?: boolean;
}

export function WhatsAppNumberSelector({
  value,
  onChange,
  disabled,
}: WhatsAppNumberSelectorProps) {
  const { data: whatsappNumbers, isLoading } = useWhatsAppNumbers();
  const { data: defaultNumber } = useDefaultWhatsAppNumber();

  const activeNumbers = whatsappNumbers?.filter((n) => n.status === "active") || [];

  // Auto-select default number if no value is set
  useEffect(() => {
    if (!value && defaultNumber && activeNumbers.length > 0) {
      onChange(defaultNumber.id);
    }
  }, [value, defaultNumber, activeNumbers.length, onChange]);

  // If only one number, auto-select it and hide selector
  if (activeNumbers.length === 1) {
    if (!value && activeNumbers[0].id !== value) {
      onChange(activeNumbers[0].id);
    }
    return null;
  }

  // Hide if loading or no numbers available
  if (isLoading || activeNumbers.length === 0) {
    return null;
  }

  const selectedValue = value || defaultNumber?.id || "";

  return (
    <div className="space-y-2">
      <Label htmlFor="whatsapp-number">Número de WhatsApp</Label>
      <Select value={selectedValue} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="whatsapp-number">
          <SelectValue placeholder="Seleccionar número" />
        </SelectTrigger>
        <SelectContent>
          {activeNumbers.map((number) => (
            <SelectItem key={number.id} value={number.id}>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{number.alias}</span>
                <span className="text-xs text-muted-foreground">
                  ({number.phone_number})
                </span>
                {number.is_default && (
                  <span className="text-xs text-emerald-600">(predeterminado)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
