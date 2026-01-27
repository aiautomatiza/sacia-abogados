/**
 * @fileoverview Formatting Utilities for Conversations
 * @description Funciones compartidas para formateo de datos
 * @refactor Elimina duplicación de código entre componentes
 */

import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtiene iniciales de un nombre
 * @example getInitials("Juan Pérez") => "JP"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Formatea timestamp de último mensaje (estilo WhatsApp)
 * @returns HH:mm si es hoy, "Ayer" si es ayer, dd/MM/yyyy para fechas anteriores
 */
export function formatLastMessageTime(timestamp: string | null): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: es });
  } else if (isYesterday(date)) {
    return 'Ayer';
  } else {
    return format(date, 'dd/MM/yyyy', { locale: es });
  }
}

/**
 * Trunca mensaje largo
 * @param message Mensaje a truncar
 * @param maxLength Longitud máxima (default: 50)
 */
export function truncateMessage(message: string | null, maxLength = 50): string {
  if (!message) return '';
  return message.length > maxLength
    ? message.substring(0, maxLength) + '...'
    : message;
}

/**
 * Formatea fecha completa para separadores
 * @example "Lunes, 15 de enero de 2025"
 */
export function formatDateSeparator(dateString: string): string {
  return format(new Date(dateString), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}
