/**
 * @fileoverview Statuses Tab Component
 * @description Tab content for managing contact statuses in settings
 */

import { StatusManager } from './StatusManager';

/**
 * StatusesTab - Wrapper for status management
 *
 * Features:
 * - Delegates to StatusManager component
 * - Maintains consistent tab structure
 */
export function StatusesTab() {
  return <StatusManager />;
}
