/**
 * @fileoverview Contact Status Types
 * @description Type definitions for contact status system
 */

import type { Database } from '@/integrations/supabase/types';

// Database row types (will be auto-generated after migration runs)
export type ContactStatusRow = Database['public']['Tables']['crm_contact_statuses']['Row'];
export type ContactStatusInsert = Database['public']['Tables']['crm_contact_statuses']['Insert'];
export type ContactStatusUpdate = Database['public']['Tables']['crm_contact_statuses']['Update'];

export type ContactStatusHistoryRow = Database['public']['Tables']['crm_contact_status_history']['Row'];

/**
 * Contact Status with computed fields
 */
export interface ContactStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon: string | null;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Contact Status with usage count (number of contacts using this status)
 */
export interface ContactStatusWithUsageCount extends ContactStatus {
  usage_count: number;
}

/**
 * Contact Status History with related data
 */
export interface ContactStatusHistory {
  id: string;
  contact_id: string;
  status_id: string | null;
  previous_status_id: string | null;
  changed_by: string;
  changed_at: string;
  tenant_id: string;
  notes: string | null;
  created_at: string;
  // Related data from JOINs
  status?: ContactStatus | null;
  previous_status?: ContactStatus | null;
  changed_by_email?: string;
}

/**
 * Form data for creating/editing contact status
 */
export interface ContactStatusFormData {
  name: string;
  color: string;
  icon?: string;
  is_default?: boolean;
}

/**
 * Filters for querying contact statuses
 */
export interface ContactStatusFilters {
  is_active?: boolean;
  search?: string;
  include_usage_count?: boolean;
}
