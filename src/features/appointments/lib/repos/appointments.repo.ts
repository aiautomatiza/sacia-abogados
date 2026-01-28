import { supabase } from "@/integrations/supabase/client";
import type {
  AppointmentDetailed,
  AppointmentFilters,
  AppointmentSortConfig,
  AppointmentStats,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
  AppointmentsListResponse,
  AppointmentTabCounts,
} from "../../types";

// ============================================================================
// Constantes
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;

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
// Listar appointments con filtros y paginacion
// ============================================================================

export async function listAppointments(
  filters: AppointmentFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sort: AppointmentSortConfig = { sortBy: "scheduled_at", sortOrder: "desc" }
): Promise<AppointmentsListResponse> {
  let query = supabase
    .from("v_appointments_detailed")
    .select("*", { count: "exact" });

  // Filtros
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `contact_name.ilike.${searchTerm},contact_phone.ilike.${searchTerm},title.ilike.${searchTerm}`
    );
  }

  if (filters.date_from) {
    query = query.gte("scheduled_at", filters.date_from.toISOString());
  }

  if (filters.date_to) {
    const endOfDay = new Date(filters.date_to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("scheduled_at", endOfDay.toISOString());
  }

  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  if (filters.location_id) {
    query = query.eq("location_id", filters.location_id);
  }

  if (filters.agent_id) {
    query = query.eq("agent_id", filters.agent_id);
  }

  if (filters.contact_id) {
    query = query.eq("contact_id", filters.contact_id);
  }

  // Filtro de tab de asignación
  if (filters.assignment_tab === "pending_assignment") {
    query = query.eq("type", "call").is("agent_id", null);
  } else if (filters.assignment_tab === "assigned") {
    query = query.or("type.eq.in_person,and(type.eq.call,agent_id.not.is.null)");
  }

  // Sorting
  query = query.order(sort.sortBy, { ascending: sort.sortOrder === "asc" });

  // Paginacion
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) throw error;
  return { data: data as AppointmentDetailed[], count: count || 0 };
}

// ============================================================================
// Obtener conteos de tabs de asignación
// ============================================================================

export async function getAppointmentTabCounts(
  baseFilters: Omit<AppointmentFilters, "assignment_tab"> = {}
): Promise<AppointmentTabCounts> {
  // Helper para aplicar filtros base
  const applyBaseFilters = (q: ReturnType<typeof supabase.from>) => {
    let query = q;

    if (baseFilters.search) {
      const searchTerm = `%${baseFilters.search}%`;
      query = query.or(
        `contact_name.ilike.${searchTerm},contact_phone.ilike.${searchTerm},title.ilike.${searchTerm}`
      );
    }

    if (baseFilters.date_from) {
      query = query.gte("scheduled_at", baseFilters.date_from.toISOString());
    }

    if (baseFilters.date_to) {
      const endOfDay = new Date(baseFilters.date_to);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("scheduled_at", endOfDay.toISOString());
    }

    if (baseFilters.statuses && baseFilters.statuses.length > 0) {
      query = query.in("status", baseFilters.statuses);
    }

    if (baseFilters.location_id) {
      query = query.eq("location_id", baseFilters.location_id);
    }

    if (baseFilters.agent_id) {
      query = query.eq("agent_id", baseFilters.agent_id);
    }

    if (baseFilters.contact_id) {
      query = query.eq("contact_id", baseFilters.contact_id);
    }

    return query;
  };

  // Query pendientes: type='call' AND agent_id IS NULL
  let pendingQuery = supabase
    .from("v_appointments_detailed")
    .select("*", { count: "exact", head: true })
    .eq("type", "call")
    .is("agent_id", null);
  pendingQuery = applyBaseFilters(pendingQuery);

  // Query asignadas: type='in_person' OR (type='call' AND agent_id IS NOT NULL)
  let assignedQuery = supabase
    .from("v_appointments_detailed")
    .select("*", { count: "exact", head: true })
    .or("type.eq.in_person,and(type.eq.call,agent_id.not.is.null)");
  assignedQuery = applyBaseFilters(assignedQuery);

  const [pendingResult, assignedResult] = await Promise.all([
    pendingQuery,
    assignedQuery,
  ]);

  if (pendingResult.error) throw pendingResult.error;
  if (assignedResult.error) throw assignedResult.error;

  return {
    pending_assignment: pendingResult.count || 0,
    assigned: assignedResult.count || 0,
  };
}

// ============================================================================
// Obtener appointment por ID
// ============================================================================

export async function getAppointmentById(
  id: string
): Promise<AppointmentDetailed> {
  const { data, error } = await supabase
    .from("v_appointments_detailed")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as AppointmentDetailed;
}

// ============================================================================
// Obtener estadisticas de appointments
// ============================================================================

export async function getAppointmentStats(
  filters: AppointmentFilters = {}
): Promise<AppointmentStats> {
  const { data, error } = await supabase.rpc("calculate_appointments_stats", {
    p_tenant_id: null, // Se obtiene automaticamente del usuario
    p_date_from: filters.date_from?.toISOString() ?? null,
    p_date_to: filters.date_to?.toISOString() ?? null,
    p_type: filters.types?.[0] ?? null,
    p_location_id: filters.location_id ?? null,
    p_agent_id: filters.agent_id ?? null,
  });

  if (error) throw error;

  // La funcion RPC retorna un array, tomamos el primer elemento
  const stats = Array.isArray(data) ? data[0] : data;

  return {
    total: stats?.total ?? 0,
    scheduled: stats?.scheduled ?? 0,
    confirmed: stats?.confirmed ?? 0,
    completed: stats?.completed ?? 0,
    cancelled: stats?.cancelled ?? 0,
    no_show: stats?.no_show ?? 0,
    in_progress: stats?.in_progress ?? 0,
    completion_rate: stats?.completion_rate ?? 0,
    cancellation_rate: stats?.cancellation_rate ?? 0,
    no_show_rate: stats?.no_show_rate ?? 0,
    calls_count: stats?.calls_count ?? 0,
    in_person_count: stats?.in_person_count ?? 0,
    avg_duration_minutes: stats?.avg_duration_minutes ?? 0,
  };
}

// ============================================================================
// Crear appointment
// ============================================================================

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<AppointmentDetailed> {
  const tenantId = await getCurrentTenantId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Validar segun tipo
  // Nota: agent_id es opcional para citas de llamada (se puede asignar despues)
  if (input.type === "in_person" && !input.location_id) {
    throw new Error("Las citas presenciales requieren una sede asignada");
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      created_by: user?.id ?? null,
      type: input.type,
      contact_id: input.contact_id,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes ?? 30,
      title: input.title ?? null,
      description: input.description ?? null,
      customer_notes: input.customer_notes ?? null,
      agent_id: input.type === "call" ? input.agent_id : null,
      location_id: input.type === "in_person" ? input.location_id : null,
      call_phone_number: input.type === "call" ? input.call_phone_number : null,
    })
    .select()
    .single();

  if (error) throw error;
  return getAppointmentById(data.id);
}

// ============================================================================
// Actualizar appointment
// ============================================================================

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput
): Promise<AppointmentDetailed> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Solo incluir campos que se proporcionaron
  if (input.scheduled_at !== undefined) updateData.scheduled_at = input.scheduled_at;
  if (input.duration_minutes !== undefined) updateData.duration_minutes = input.duration_minutes;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.customer_notes !== undefined) updateData.customer_notes = input.customer_notes;
  if (input.agent_id !== undefined) updateData.agent_id = input.agent_id;
  if (input.location_id !== undefined) updateData.location_id = input.location_id;
  if (input.call_phone_number !== undefined) updateData.call_phone_number = input.call_phone_number;

  // Si se cancela, registrar fecha
  if (input.status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
    if (input.cancelled_reason) {
      updateData.cancelled_reason = input.cancelled_reason;
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return getAppointmentById(data.id);
}

// ============================================================================
// Actualizar estado de appointment
// ============================================================================

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<AppointmentDetailed> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "cancelled") {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return getAppointmentById(data.id);
}

// ============================================================================
// Cancelar appointment
// ============================================================================

export async function cancelAppointment(
  id: string,
  reason?: string
): Promise<AppointmentDetailed> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled" as AppointmentStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return getAppointmentById(data.id);
}

// ============================================================================
// Reprogramar appointment
// ============================================================================

export async function rescheduleAppointment(
  id: string,
  newDateTime: string,
  reason?: string
): Promise<AppointmentDetailed> {
  // Obtener cita original
  const original = await getAppointmentById(id);

  // Marcar original como reprogramada
  await supabase
    .from("appointments")
    .update({
      status: "rescheduled" as AppointmentStatus,
      cancelled_reason: reason || "Reprogramada",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Crear nueva cita con los mismos datos pero nueva fecha
  return createAppointment({
    type: original.type,
    contact_id: original.contact_id,
    scheduled_at: newDateTime,
    duration_minutes: original.duration_minutes,
    title: original.title ?? undefined,
    description: original.description ?? undefined,
    customer_notes: original.customer_notes ?? undefined,
    agent_id: original.agent_id ?? undefined,
    location_id: original.location_id ?? undefined,
    call_phone_number: original.call_phone_number ?? undefined,
  });
}

// ============================================================================
// Eliminar appointment
// ============================================================================

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Obtener appointments para calendario
// ============================================================================

export async function getAppointmentsForCalendar(
  startDate: Date,
  endDate: Date,
  filters: Partial<AppointmentFilters> = {}
): Promise<AppointmentDetailed[]> {
  let query = supabase
    .from("v_appointments_detailed")
    .select("*")
    .gte("scheduled_at", startDate.toISOString())
    .lte("scheduled_at", endDate.toISOString())
    .not("status", "in", "(cancelled,rescheduled)");

  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }

  if (filters.location_id) {
    query = query.eq("location_id", filters.location_id);
  }

  if (filters.agent_id) {
    query = query.eq("agent_id", filters.agent_id);
  }

  const { data, error } = await query.order("scheduled_at", { ascending: true });

  if (error) throw error;

  return data as AppointmentDetailed[];
}

// ============================================================================
// Obtener proximas citas de un contacto
// ============================================================================

export async function getContactUpcomingAppointments(
  contactId: string,
  limit: number = 5
): Promise<AppointmentDetailed[]> {
  const { data, error } = await supabase.rpc("get_contact_upcoming_appointments", {
    p_contact_id: contactId,
    p_limit: limit,
  });

  if (error) throw error;
  return data as AppointmentDetailed[];
}

// ============================================================================
// Verificar disponibilidad
// ============================================================================

export async function checkAvailability(
  type: "call" | "in_person",
  scheduledAt: string,
  durationMinutes: number,
  agentId?: string,
  locationId?: string,
  excludeAppointmentId?: string
): Promise<boolean> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase.rpc("check_appointment_availability", {
    p_tenant_id: tenantId,
    p_type: type,
    p_scheduled_at: scheduledAt,
    p_duration_minutes: durationMinutes,
    p_agent_id: agentId ?? null,
    p_location_id: locationId ?? null,
    p_exclude_appointment_id: excludeAppointmentId ?? null,
  });

  if (error) throw error;
  return data as boolean;
}

// ============================================================================
// Vincular llamada con appointment
// ============================================================================

export async function linkCallToAppointment(
  appointmentId: string,
  callId: string
): Promise<AppointmentDetailed> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      call_id: callId,
      status: "completed" as AppointmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) throw error;
  return getAppointmentById(data.id);
}

// ============================================================================
// Marcar recordatorio como enviado
// ============================================================================

export async function markReminderSent(id: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({
      reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Marcar confirmacion como enviada
// ============================================================================

export async function markConfirmationSent(id: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({
      confirmation_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

// ============================================================================
// Obtener citas pendientes para hoy
// ============================================================================

export async function getTodayAppointments(): Promise<AppointmentDetailed[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("v_appointments_detailed")
    .select("*")
    .gte("scheduled_at", today.toISOString())
    .lt("scheduled_at", tomorrow.toISOString())
    .not("status", "in", "(cancelled,rescheduled,completed)")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data as AppointmentDetailed[];
}

// ============================================================================
// Obtener citas proximas (siguiente semana)
// ============================================================================

export async function getUpcomingAppointments(
  days: number = 7
): Promise<AppointmentDetailed[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from("v_appointments_detailed")
    .select("*")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", futureDate.toISOString())
    .not("status", "in", "(cancelled,rescheduled)")
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return data as AppointmentDetailed[];
}

// ============================================================================
// Export como objeto
// ============================================================================

export const appointmentsRepo = {
  listAppointments,
  getAppointmentById,
  getAppointmentTabCounts,
  getAppointmentStats,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  deleteAppointment,
  getAppointmentsForCalendar,
  getContactUpcomingAppointments,
  checkAvailability,
  linkCallToAppointment,
  markReminderSent,
  markConfirmationSent,
  getTodayAppointments,
  getUpcomingAppointments,
};
