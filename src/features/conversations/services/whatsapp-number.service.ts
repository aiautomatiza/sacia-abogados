import { supabase } from "@/integrations/supabase/client";
import type { UserScope } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface WhatsAppNumber {
  id: string;
  tenant_id: string;
  phone_number: string;
  phone_number_id: string; // Meta/WhatsApp Business API Phone Number ID
  waba_id: string | null; // WhatsApp Business Account ID
  alias: string;
  is_default: boolean;
  status: 'active' | 'inactive';
  whatsapp_credential: string | null;
  webhook_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppNumberInput {
  tenant_id: string;
  phone_number: string;
  phone_number_id: string; // Required: Meta Phone Number ID
  waba_id?: string | null; // Optional: WhatsApp Business Account ID
  alias: string;
  is_default?: boolean;
  whatsapp_credential?: string;
  webhook_url?: string;
}

export interface UpdateWhatsAppNumberInput {
  phone_number?: string;
  phone_number_id?: string; // Editable: Meta Phone Number ID
  waba_id?: string | null; // Editable: WhatsApp Business Account ID
  alias?: string;
  is_default?: boolean;
  status?: 'active' | 'inactive';
  whatsapp_credential?: string;
  webhook_url?: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Meta Phone Number ID format
 * Accepts:
 * - Meta IDs: 10-20 digit numbers (e.g., "1234567890123456")
 * - Placeholders: PENDING_xxxxxxxx (where x is hex)
 */
function validatePhoneNumberId(phoneNumberId: string): boolean {
  const metaIdPattern = /^\d{10,20}$/;
  const placeholderPattern = /^PENDING_[a-f0-9]{8}$/;

  return metaIdPattern.test(phoneNumberId) || placeholderPattern.test(phoneNumberId);
}

/**
 * Validate WABA ID format
 * Accepts:
 * - Meta WABA IDs: 15-17 digit numbers (e.g., "102290129340398")
 * - Placeholders: WABA_PENDING_xxxxxxxx (where x is hex)
 */
function validateWabaId(wabaId: string): boolean {
  const metaIdPattern = /^\d{15,17}$/;
  const placeholderPattern = /^WABA_PENDING_[a-f0-9]{8}$/;

  return metaIdPattern.test(wabaId) || placeholderPattern.test(wabaId);
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * List all WhatsApp numbers for a tenant
 */
export async function listWhatsAppNumbers(scope: UserScope): Promise<WhatsAppNumber[]> {
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("*")
    .eq("tenant_id", scope.tenantId)
    .order("is_default", { ascending: false })
    .order("alias", { ascending: true });

  if (error) {
    console.error("Error listing WhatsApp numbers:", error);
    throw new Error(`Failed to list WhatsApp numbers: ${error.message}`);
  }

  return (data as WhatsAppNumber[]) || [];
}

/**
 * Get default WhatsApp number for a tenant
 */
export async function getDefaultWhatsAppNumber(scope: UserScope): Promise<WhatsAppNumber | null> {
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("*")
    .eq("tenant_id", scope.tenantId)
    .eq("is_default", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Error getting default WhatsApp number:", error);
    throw new Error(`Failed to get default WhatsApp number: ${error.message}`);
  }

  return data as WhatsAppNumber | null;
}

/**
 * Get WhatsApp number by ID
 */
export async function getWhatsAppNumberById(
  id: string,
  scope: UserScope
): Promise<WhatsAppNumber | null> {
  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();

  if (error) {
    console.error("Error getting WhatsApp number:", error);
    throw new Error(`Failed to get WhatsApp number: ${error.message}`);
  }

  return data as WhatsAppNumber | null;
}

/**
 * Create a new WhatsApp number
 */
export async function createWhatsAppNumber(
  input: CreateWhatsAppNumberInput
): Promise<WhatsAppNumber> {
  // Validate E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(input.phone_number)) {
    throw new Error("Phone number must be in E.164 format (e.g., +14155552671)");
  }

  // Validate phone_number_id format
  if (!validatePhoneNumberId(input.phone_number_id)) {
    throw new Error(
      "phone_number_id debe ser un ID numérico de Meta (10-20 dígitos) " +
      "o un placeholder temporal (PENDING_xxxxxxxx)"
    );
  }

  // Validate waba_id format if provided
  if (input.waba_id && !validateWabaId(input.waba_id)) {
    throw new Error(
      "waba_id debe ser un ID numérico de Meta (15-17 dígitos) " +
      "o un placeholder temporal (WABA_PENDING_xxxxxxxx)"
    );
  }

  // Validate alias length
  if (!input.alias || input.alias.trim().length === 0) {
    throw new Error("Alias is required");
  }

  if (input.alias.length > 50) {
    throw new Error("Alias must be 50 characters or less");
  }

  // Validate webhook URL if provided
  if (input.webhook_url) {
    try {
      new URL(input.webhook_url);
    } catch {
      throw new Error("Invalid webhook URL");
    }
  }

  const { data, error } = await supabase
    .from("whatsapp_numbers")
    .insert({
      tenant_id: input.tenant_id,
      phone_number: input.phone_number,
      phone_number_id: input.phone_number_id,
      waba_id: input.waba_id || null,
      alias: input.alias.trim(),
      is_default: input.is_default || false,
      whatsapp_credential: input.whatsapp_credential || null,
      webhook_url: input.webhook_url || null,
      status: "active",
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating WhatsApp number:", error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('phone_number_id')) {
        throw new Error("Este Phone Number ID de Meta ya está registrado");
      }
      if (error.message.includes('phone_number')) {
        throw new Error("Este número de teléfono ya está registrado");
      }
      if (error.message.includes('alias')) {
        throw new Error("Este alias ya está en uso");
      }
    }

    throw new Error(`Failed to create WhatsApp number: ${error.message}`);
  }

  return data as WhatsAppNumber;
}

/**
 * Update an existing WhatsApp number
 */
export async function updateWhatsAppNumber(
  id: string,
  input: UpdateWhatsAppNumberInput,
  scope: UserScope
): Promise<void> {
  // Validate phone number format if provided
  if (input.phone_number) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(input.phone_number)) {
      throw new Error("Phone number must be in E.164 format (e.g., +14155552671)");
    }
  }

  // Validate phone_number_id format if provided
  if (input.phone_number_id !== undefined && !validatePhoneNumberId(input.phone_number_id)) {
    throw new Error(
      "phone_number_id debe ser un ID numérico de Meta (10-20 dígitos) " +
      "o un placeholder temporal (PENDING_xxxxxxxx)"
    );
  }

  // Validate waba_id format if provided
  if (input.waba_id !== undefined && input.waba_id !== null && !validateWabaId(input.waba_id)) {
    throw new Error(
      "waba_id debe ser un ID numérico de Meta (15-17 dígitos) " +
      "o un placeholder temporal (WABA_PENDING_xxxxxxxx)"
    );
  }

  // Validate alias if provided
  if (input.alias !== undefined) {
    if (!input.alias || input.alias.trim().length === 0) {
      throw new Error("Alias is required");
    }
    if (input.alias.length > 50) {
      throw new Error("Alias must be 50 characters or less");
    }
  }

  // Validate webhook URL if provided
  if (input.webhook_url) {
    try {
      new URL(input.webhook_url);
    } catch {
      throw new Error("Invalid webhook URL");
    }
  }

  // Prepare update object
  const updateData: any = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // Trim alias if provided
  if (input.alias) {
    updateData.alias = input.alias.trim();
  }

  const { error } = await supabase
    .from("whatsapp_numbers")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error updating WhatsApp number:", error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('phone_number_id')) {
        throw new Error("Este Phone Number ID de Meta ya está registrado");
      }
      if (error.message.includes('phone_number')) {
        throw new Error("Este número de teléfono ya está registrado");
      }
      if (error.message.includes('alias')) {
        throw new Error("Este alias ya está en uso");
      }
    }

    throw new Error(`Failed to update WhatsApp number: ${error.message}`);
  }
}

/**
 * Delete a WhatsApp number
 * Note: Conversations using this number will have whatsapp_number_id set to NULL (ON DELETE SET NULL)
 */
export async function deleteWhatsAppNumber(id: string, scope: UserScope): Promise<void> {
  // Check if this is the default number
  const number = await getWhatsAppNumberById(id, scope);

  if (!number) {
    throw new Error("WhatsApp number not found");
  }

  // Prevent deletion of default number without confirmation
  // (This check can be bypassed in the UI with explicit confirmation)
  if (number.is_default) {
    // Check if there are other active numbers
    const allNumbers = await listWhatsAppNumbers(scope);
    const activeNumbers = allNumbers.filter(n => n.status === 'active');

    if (activeNumbers.length === 1) {
      throw new Error("Cannot delete the last active WhatsApp number");
    }
  }

  const { error } = await supabase
    .from("whatsapp_numbers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", scope.tenantId);

  if (error) {
    console.error("Error deleting WhatsApp number:", error);
    throw new Error(`Failed to delete WhatsApp number: ${error.message}`);
  }
}

/**
 * Get count of conversations using a specific WhatsApp number
 */
export async function getConversationCountForNumber(
  numberId: string,
  scope: UserScope
): Promise<number> {
  const { count, error } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", scope.tenantId)
    .eq("whatsapp_number_id", numberId);

  if (error) {
    console.error("Error counting conversations:", error);
    return 0;
  }

  return count || 0;
}
