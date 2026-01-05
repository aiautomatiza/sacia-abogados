import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import type { WhatsAppNumber } from "../types";

interface WhatsAppNumberBadgeProps {
  whatsappNumber: WhatsAppNumber;
  size?: "default" | "sm";
  showPhone?: boolean;
}

export function WhatsAppNumberBadge({
  whatsappNumber,
  size = "default",
  showPhone = false
}: WhatsAppNumberBadgeProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Badge
      variant="outline"
      className={`gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 ${textSize}`}
    >
      <Phone className={iconSize} />
      {whatsappNumber.alias}
      {showPhone && (
        <span className="text-muted-foreground">({whatsappNumber.phone_number})</span>
      )}
    </Badge>
  );
}
