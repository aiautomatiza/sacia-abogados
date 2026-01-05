/**
 * @fileoverview Channel Badge Component - ADAPTADO PARA TENANT-BASED
 * @description Display channel with icon and color
 *
 * CAMBIOS vs original:
 * - Ninguno (componente simple sin referencias a clinic/account)
 */

import { Badge } from "@/components/ui/badge";
import { MessageCircle, Instagram, Mail, Globe } from "lucide-react";
import type { ConversationChannel } from "../types";

interface Props {
  channel: ConversationChannel;
  size?: "default" | "sm";
}

const CHANNEL_CONFIG: Record<
  ConversationChannel,
  {
    icon: typeof MessageCircle;
    label: string;
    className: string;
  }
> = {
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  instagram: {
    icon: Instagram,
    label: "Instagram",
    className: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
  webchat: {
    icon: Globe,
    label: "Web Chat",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  email: {
    icon: Mail,
    label: "Email",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

export function ChannelBadge({ channel, size = "default" }: Props) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Badge variant="outline" className={`gap-1 ${config.className} ${textSize}`}>
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
}
