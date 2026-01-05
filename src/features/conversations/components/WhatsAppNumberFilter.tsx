import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppNumbers } from "../hooks/useWhatsAppNumbers";
import { Phone } from "lucide-react";

interface WhatsAppNumberFilterProps {
  value?: string;
  onChange: (whatsappNumberId: string | undefined) => void;
}

export function WhatsAppNumberFilter({ value, onChange }: WhatsAppNumberFilterProps) {
  const { data: whatsappNumbers, isLoading } = useWhatsAppNumbers();

  const activeNumbers = whatsappNumbers?.filter((n) => n.status === "active") || [];

  // Hide if only one or no numbers (no need to filter)
  if (isLoading || activeNumbers.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Número de WhatsApp</Label>
      <Select
        value={value || "all"}
        onValueChange={(val) => onChange(val === "all" ? undefined : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todos los números" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los números</SelectItem>
          {activeNumbers.map((number) => (
            <SelectItem key={number.id} value={number.id}>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span>{number.alias}</span>
                <span className="text-xs text-muted-foreground">
                  ({number.phone_number})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
