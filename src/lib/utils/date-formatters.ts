/**
 * @fileoverview Date Formatting Utilities
 * @description Safe date formatting functions with error handling
 */

import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Safely format a date string with fallback
 * @param dateString - ISO date string or null/undefined
 * @param formatStr - date-fns format string
 * @returns Formatted date or '—' if invalid
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  formatStr: string = "d MMM yyyy"
): string {
  if (!dateString) return "—";

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "—";
    return format(date, formatStr, { locale: es });
  } catch {
    return "—";
  }
}
