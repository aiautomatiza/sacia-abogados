export interface Contact {
  id: string;
  tenant_id: string;
  numero: string;
  nombre: string | null;
  attributes: Record<string, any>;
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
  [key: string]: any;
}
