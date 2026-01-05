/**
 * @fileoverview Calls Module Types
 * @description TypeScript types for the calls feature
 */

import { Database } from "@/integrations/supabase/types";

// Enum types from database
export type CallState = Database["public"]["Enums"]["call_state"];
export type CallType = Database["public"]["Enums"]["call_type"];

// Base call from crm_calls table
export type Call = Database["public"]["Tables"]["crm_calls"]["Row"];

// Detailed call from v_crm_calls_detailed view
export interface CallDetailed {
  id: string;
  tenant_id: string;
  contact_id: string;
  agent_id: string | null;
  call_datetime: string;
  type: CallType;
  state: CallState;
  duration_seconds: number | null;
  audio_duration_seconds: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_attributes: Record<string, unknown> | null;
  tenant_name: string | null;
  agent_email: string | null;
  call_sid: string | null;
  end_reason: string | null;
  summary: string | null;
  transcript: string | null;
  audio_url: string | null;
}

// Filters for calls queries
export interface CallFilters {
  search?: string;
  date_from?: Date | null;
  date_to?: Date | null;
  states?: CallState[];
  types?: CallType[];
}

// Stats returned from calculate_calls_stats function
export interface CallStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  missed: number;
  voicemail: number;
  user_hangup: number;
  scheduled: number;
  total_duration: number;
  avg_duration: number;
  completion_rate: number;
}

// Sort configuration
export interface CallSortConfig {
  sortBy: keyof CallDetailed;
  sortOrder: "asc" | "desc";
}

// Pagination state
export interface CallPaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Preferences state
export interface CallPreferences {
  density: "comfortable" | "compact";
  visibleColumns: string[];
}

// Audio player state
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

// API response types
export interface CallsListResponse {
  data: CallDetailed[];
  count: number;
}
