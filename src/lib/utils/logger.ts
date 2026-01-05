/**
 * @fileoverview Conditional Logger
 * @description Logger que solo funciona en development, elimina console.logs de producción
 * @production 0 logs en bundle de producción
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDevelopment) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isDevelopment) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) console.debug(...args);
  },
};
