export interface Contact {
  id: string;
  tenant_id: string;
  numero: string;
  nombre: string | null;
  external_crm_id: string | null;
  attributes: Record<string, any>;
  status_id: string | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  tenant_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'date' | 'textarea' | 'checkbox' | 'url';
  options: string[];
  required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  numero: string;
  nombre?: string;
  [key: string]: any;
}

export interface ContactFilters {
  search?: string;
  status_ids?: string[]; // Multi-select filter for statuses
  [key: string]: any;
}

/**
 * Contact with status relationship included (from JOIN)
 */
export interface ContactWithStatus extends Contact {
  status?: import('./status.types').ContactStatus | null;
}

// Re-export status types
export * from './status.types';
