/**
 * @fileoverview Call Formatting Utilities
 * @description Functions for formatting call data
 */

import { CallState, CallType } from "../types/call.types";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  CheckCircle,
  XCircle,
  Clock,
  Voicemail,
  Calendar,
  UserX,
} from "lucide-react";

/**
 * Format call duration from seconds to human readable format
 */
export function formatCallDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "-";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format call state to Spanish label
 */
export function formatCallState(state: CallState): string {
  const stateLabels: Record<CallState, string> = {
    pending: "Pendiente",
    completed: "Completada",
    failed: "Fallida",
    missed: "Perdida",
    voicemail: "Buzón de voz",
    user_hangup: "Colgó usuario",
    scheduled: "Programada",
  };
  return stateLabels[state] || state;
}

/**
 * Format call type to Spanish label
 */
export function formatCallType(type: CallType): string {
  const typeLabels: Record<CallType, string> = {
    inbound: "Entrante",
    outbound: "Saliente",
  };
  return typeLabels[type] || type;
}

/**
 * Get badge variant for call state
 */
export function getCallStateVariant(
  state: CallState
): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<CallState, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    scheduled: "secondary",
    pending: "outline",
    failed: "destructive",
    missed: "destructive",
    voicemail: "secondary",
    user_hangup: "outline",
  };
  return variants[state] || "outline";
}

/**
 * Get color class for call state
 */
export function getCallStateColor(state: CallState): string {
  const colors: Record<CallState, string> = {
    completed: "text-green-600 bg-green-50 border-green-200",
    scheduled: "text-blue-600 bg-blue-50 border-blue-200",
    pending: "text-yellow-600 bg-yellow-50 border-yellow-200",
    failed: "text-red-600 bg-red-50 border-red-200",
    missed: "text-orange-600 bg-orange-50 border-orange-200",
    voicemail: "text-purple-600 bg-purple-50 border-purple-200",
    user_hangup: "text-gray-600 bg-gray-50 border-gray-200",
  };
  return colors[state] || "text-muted-foreground bg-muted";
}

/**
 * Get icon component for call state
 */
export function getCallStateIcon(state: CallState) {
  const icons: Record<CallState, typeof Phone> = {
    completed: CheckCircle,
    scheduled: Calendar,
    pending: Clock,
    failed: XCircle,
    missed: PhoneMissed,
    voicemail: Voicemail,
    user_hangup: UserX,
  };
  return icons[state] || Phone;
}

/**
 * Get icon component for call type
 */
export function getCallTypeIcon(type: CallType) {
  const icons: Record<CallType, typeof Phone> = {
    inbound: PhoneIncoming,
    outbound: PhoneOutgoing,
  };
  return icons[type] || Phone;
}

/**
 * Get color class for call type
 */
export function getCallTypeColor(type: CallType): string {
  const colors: Record<CallType, string> = {
    inbound: "text-blue-600 bg-blue-50 border-blue-200",
    outbound: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };
  return colors[type] || "text-muted-foreground bg-muted";
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string | null, maxLength: number = 50): string {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format date time for display
 */
export function formatCallDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Format date for display (without time)
 */
export function formatCallDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format time for display
 */
export function formatCallTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
