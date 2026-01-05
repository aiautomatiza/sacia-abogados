/**
 * @fileoverview WhatsApp Templates Service
 * @description Service for managing WhatsApp message templates
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { UserScope } from "../types";

export type WhatsAppTemplateRow = Database["public"]["Tables"]["whatsapp_templates"]["Row"];

// WhatsApp Template types
export type WhatsAppTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type WhatsAppTemplateStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface WhatsAppTemplateVariable {
  name: string;
  position: number;
}

export interface WhatsAppTemplate {
  id: string;
  tenant_id: string;
  name: string;
  template_id: string;
  category: WhatsAppTemplateCategory;
  language: string;
  status: WhatsAppTemplateStatus;
  header_text: string | null;
  body_text: string;
  footer_text: string | null;
  variables: WhatsAppTemplateVariable[];
  waba_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * List WhatsApp templates for a tenant (using scope)
 */
export const listTemplatesByScope = async (scope: UserScope | null): Promise<WhatsAppTemplateRow[]> => {
  if (!scope) return [];

  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", scope.tenantId)
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing WhatsApp templates:", error);
    throw error;
  }

  return data || [];
};

/**
 * Get template by ID
 */
export const getTemplate = async (templateId: string): Promise<WhatsAppTemplateRow | null> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    console.error("Error getting WhatsApp template:", error);
    throw error;
  }

  return data;
};

/**
 * List all WhatsApp templates for a tenant
 */
export const listTemplates = async (tenantId: string): Promise<WhatsAppTemplate[]> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing WhatsApp templates:", error);
    throw error;
  }

  return (data || []).map((template) => ({
    ...template,
    category: template.category as WhatsAppTemplateCategory,
    status: template.status as WhatsAppTemplateStatus,
    variables: (Array.isArray(template.variables) ? template.variables : []) as unknown as WhatsAppTemplateVariable[],
  }));
};

/**
 * Get a specific WhatsApp template by ID
 */
export const getTemplateById = async (id: string): Promise<WhatsAppTemplate | null> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error getting WhatsApp template:", error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    category: data.category as WhatsAppTemplateCategory,
    status: data.status as WhatsAppTemplateStatus,
    variables: (Array.isArray(data.variables) ? data.variables : []) as unknown as WhatsAppTemplateVariable[],
  };
};

/**
 * Get approved templates only for a tenant
 */
export const listApprovedTemplates = async (tenantId: string): Promise<WhatsAppTemplate[]> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "APPROVED")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing approved WhatsApp templates:", error);
    throw error;
  }

  return (data || []).map((template) => ({
    ...template,
    category: template.category as WhatsAppTemplateCategory,
    status: template.status as WhatsAppTemplateStatus,
    variables: (Array.isArray(template.variables) ? template.variables : []) as unknown as WhatsAppTemplateVariable[],
  }));
};

/**
 * Create a new WhatsApp template
 */
export const createTemplate = async (
  template: Omit<WhatsAppTemplate, "id" | "created_at" | "updated_at">
): Promise<WhatsAppTemplate> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .insert({
      tenant_id: template.tenant_id,
      name: template.name,
      template_id: template.template_id,
      category: template.category,
      language: template.language,
      status: template.status,
      header_text: template.header_text,
      body_text: template.body_text,
      footer_text: template.footer_text,
      variables: template.variables as any,
      waba_id: template.waba_id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating WhatsApp template:", error);
    throw error;
  }

  return {
    ...data,
    category: data.category as WhatsAppTemplateCategory,
    status: data.status as WhatsAppTemplateStatus,
    variables: (Array.isArray(data.variables) ? data.variables : []) as unknown as WhatsAppTemplateVariable[],
  };
};

/**
 * Update a WhatsApp template
 */
export const updateTemplate = async (
  id: string,
  updates: Partial<Omit<WhatsAppTemplate, "id" | "tenant_id" | "created_at" | "updated_at">>
): Promise<void> => {
  const { error } = await supabase
    .from("whatsapp_templates")
    .update({
      ...updates,
      variables: updates.variables ? (updates.variables as any) : undefined,
      waba_id: updates.waba_id !== undefined ? updates.waba_id : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating WhatsApp template:", error);
    throw error;
  }
};

/**
 * List WhatsApp templates filtered by WABA ID
 * @param tenantId - Tenant ID
 * @param wabaId - WhatsApp Business Account ID
 * @returns Approved templates for the specified WABA
 */
export const listTemplatesByWaba = async (
  tenantId: string,
  wabaId: string
): Promise<WhatsAppTemplate[]> => {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("waba_id", wabaId)
    .eq("status", "APPROVED")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing WhatsApp templates by WABA:", error);
    throw error;
  }

  return (data || []).map((template) => ({
    ...template,
    category: template.category as WhatsAppTemplateCategory,
    status: template.status as WhatsAppTemplateStatus,
    variables: (Array.isArray(template.variables) ? template.variables : []) as unknown as WhatsAppTemplateVariable[],
  }));
};

/**
 * List WhatsApp templates for a specific conversation
 * Filters templates by the WABA of the conversation's WhatsApp number
 * @param tenantId - Tenant ID
 * @param conversationId - Conversation ID
 * @returns Templates available for this conversation's WABA
 */
export const listTemplatesForConversation = async (
  tenantId: string,
  conversationId: string
): Promise<WhatsAppTemplate[]> => {
  // Get conversation with whatsapp_number to determine WABA
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select(`
      whatsapp_number_id,
      whatsapp_number:whatsapp_numbers!conversations_whatsapp_number_id_fkey (
        waba_id
      )
    `)
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) {
    console.error("Error fetching conversation for template filtering:", convError);
    throw convError;
  }

  // If no WABA configured, fallback to all tenant templates (backward compatibility)
  const wabaId = (conversation?.whatsapp_number as any)?.waba_id;
  if (!wabaId) {
    return listApprovedTemplates(tenantId);
  }

  // Filter by WABA
  return listTemplatesByWaba(tenantId, wabaId);
};

/**
 * Delete a WhatsApp template
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("whatsapp_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting WhatsApp template:", error);
    throw error;
  }
};
