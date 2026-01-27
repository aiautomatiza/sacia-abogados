import { supabase } from "@/integrations/supabase/client";
import type {
  TenantLocation,
  LocationFilters,
  CreateLocationInput,
  UpdateLocationInput,
  LocationsListResponse,
} from "../../types";

// ============================================================================
// Helper para obtener tenant_id del usuario actual
// ============================================================================

async function getCurrentTenantId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) throw new Error("No tenant assigned");
  return profile.tenant_id;
}

// ============================================================================
// Listar locations
// ============================================================================

export async function listLocations(
  filters: LocationFilters = {}
): Promise<LocationsListResponse> {
  let query = supabase
    .from("tenant_locations")
    .select("*", { count: "exact" });

  // Filtros
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${searchTerm},code.ilike.${searchTerm},city.ilike.${searchTerm},address_line1.ilike.${searchTerm}`
    );
  }

  if (filters.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  // Ordenar: default primero, luego por nombre
  query = query
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as TenantLocation[], count: count || 0 };
}

// ============================================================================
// Obtener location por ID
// ============================================================================

export async function getLocationById(id: string): Promise<TenantLocation> {
  const { data, error } = await supabase
    .from("tenant_locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as TenantLocation;
}

// ============================================================================
// Obtener location por defecto
// ============================================================================

export async function getDefaultLocation(): Promise<TenantLocation | null> {
  const { data, error } = await supabase
    .from("tenant_locations")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data as TenantLocation | null;
}

// ============================================================================
// Obtener locations activas (para selectores)
// ============================================================================

export async function getActiveLocations(): Promise<TenantLocation[]> {
  const { data, error } = await supabase
    .from("tenant_locations")
    .select("*")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return data as TenantLocation[];
}

// ============================================================================
// Crear location
// ============================================================================

export async function createLocation(
  input: CreateLocationInput
): Promise<TenantLocation> {
  const tenantId = await getCurrentTenantId();

  // Si es default, quitar el flag de las otras
  if (input.is_default) {
    await supabase
      .from("tenant_locations")
      .update({ is_default: false })
      .eq("tenant_id", tenantId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("tenant_locations")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      code: input.code || null,
      address_line1: input.address_line1,
      address_line2: input.address_line2 || null,
      city: input.city,
      state_province: input.state_province || null,
      postal_code: input.postal_code || null,
      country: input.country || "Espana",
      phone: input.phone || null,
      email: input.email || null,
      timezone: input.timezone || "Europe/Madrid",
      is_active: input.is_active ?? true,
      is_default: input.is_default ?? false,
      operating_hours: input.operating_hours || {},
      latitude: input.latitude || null,
      longitude: input.longitude || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TenantLocation;
}

// ============================================================================
// Actualizar location
// ============================================================================

export async function updateLocation(
  id: string,
  input: UpdateLocationInput
): Promise<TenantLocation> {
  const tenantId = await getCurrentTenantId();

  // Si se esta estableciendo como default, quitar el flag de las otras
  if (input.is_default) {
    await supabase
      .from("tenant_locations")
      .update({ is_default: false })
      .eq("tenant_id", tenantId)
      .eq("is_default", true)
      .neq("id", id);
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Solo incluir campos que se proporcionaron
  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.address_line1 !== undefined) updateData.address_line1 = input.address_line1;
  if (input.address_line2 !== undefined) updateData.address_line2 = input.address_line2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state_province !== undefined) updateData.state_province = input.state_province;
  if (input.postal_code !== undefined) updateData.postal_code = input.postal_code;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.is_default !== undefined) updateData.is_default = input.is_default;
  if (input.operating_hours !== undefined) updateData.operating_hours = input.operating_hours;
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;

  const { data, error } = await supabase
    .from("tenant_locations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TenantLocation;
}

// ============================================================================
// Eliminar location
// ============================================================================

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from("tenant_locations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Establecer como default
// ============================================================================

export async function setDefaultLocation(id: string): Promise<TenantLocation> {
  const tenantId = await getCurrentTenantId();

  // Quitar flag de todas las otras
  await supabase
    .from("tenant_locations")
    .update({ is_default: false })
    .eq("tenant_id", tenantId)
    .eq("is_default", true);

  // Establecer la nueva como default
  const { data, error } = await supabase
    .from("tenant_locations")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TenantLocation;
}

// ============================================================================
// Activar/Desactivar location
// ============================================================================

export async function toggleLocationActive(
  id: string,
  isActive: boolean
): Promise<TenantLocation> {
  const { data, error } = await supabase
    .from("tenant_locations")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TenantLocation;
}

// ============================================================================
// Export como objeto
// ============================================================================

export const locationsRepo = {
  listLocations,
  getLocationById,
  getDefaultLocation,
  getActiveLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  setDefaultLocation,
  toggleLocationActive,
};
