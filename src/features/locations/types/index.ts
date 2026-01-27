import { Database, Json } from "@/integrations/supabase/types";

// ============================================================================
// Tipos base de la tabla
// ============================================================================

export type TenantLocation = Database["public"]["Tables"]["tenant_locations"]["Row"];
export type TenantLocationInsert = Database["public"]["Tables"]["tenant_locations"]["Insert"];
export type TenantLocationUpdate = Database["public"]["Tables"]["tenant_locations"]["Update"];

// ============================================================================
// Horario de operacion
// ============================================================================

export interface DaySchedule {
  open: string; // "09:00"
  close: string; // "18:00"
}

export interface OperatingHours {
  monday?: DaySchedule | null;
  tuesday?: DaySchedule | null;
  wednesday?: DaySchedule | null;
  thursday?: DaySchedule | null;
  friday?: DaySchedule | null;
  saturday?: DaySchedule | null;
  sunday?: DaySchedule | null;
}

// ============================================================================
// Filtros
// ============================================================================

export interface LocationFilters {
  search?: string;
  is_active?: boolean;
  city?: string;
}

// ============================================================================
// Inputs para crear/editar
// ============================================================================

export interface CreateLocationInput {
  name: string;
  code?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_active?: boolean;
  is_default?: boolean;
  operating_hours?: OperatingHours;
  latitude?: number;
  longitude?: number;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_active?: boolean;
  is_default?: boolean;
  operating_hours?: OperatingHours;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// Respuestas de API
// ============================================================================

export interface LocationsListResponse {
  data: TenantLocation[];
  count: number;
}

// ============================================================================
// Helper para parsear operating_hours desde Json
// ============================================================================

export function parseOperatingHours(json: Json | null): OperatingHours {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {};
  }
  return json as OperatingHours;
}

// ============================================================================
// Constantes
// ============================================================================

export const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
] as const;

export const TIMEZONES = [
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/London", label: "Londres (GMT/BST)" },
  { value: "America/New_York", label: "Nueva York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "America/Mexico_City", label: "Ciudad de Mexico (CST/CDT)" },
  { value: "America/Bogota", label: "Bogota (COT)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (ART)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
] as const;
