export interface Campaign {
  id: string;
  tenant_id: string;
  channel: 'whatsapp' | 'llamadas';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_contacts: number;
  total_batches: number;
  batches_sent: number;
  batches_failed: number;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  updated_at: string | null;
}

export interface CampaignBatch {
  id: string;
  campaign_id: string;
  batch_number: number;
  total_batches: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  scheduled_for: string;
  processed_at: string | null;
  contacts: CampaignContact[];
}

export interface CampaignContact {
  id: string;
  nombre: string | null;
  numero: string;
  attributes: Record<string, any>;
}

export interface CampaignWithProgress extends Campaign {
  progress_percentage: number;
  duration_minutes: number | null;
}

export interface CampaignFilters {
  channel?: 'whatsapp' | 'llamadas';
  status?: Campaign['status'];
}

export interface CampaignContactWithBatch extends CampaignContact {
  batch_number: number;
  batch_status: string;
  sent_at: string | null;
}

// Wizard types
export type ColumnMapping = Record<string, string>;

// Source step + import steps (1-3) + crm step + final step
export type WizardStep = 'source' | 'upload' | 'mapping' | 'confirm' | 'contacts' | 'launch';

export type ContactSourceType = 'import' | 'crm' | null;

export interface ImportStats {
  total: number;
  created: number;
  updated: number;
}

// Contact selection for CRM source
export interface ContactSelectionState {
  mode: 'manual' | 'all_filtered';
  selectedIds: string[];
  excludedIds: string[];
  totalFiltered: number;
}

// Validation types
export interface CampaignValidationError {
  code: string;
  message: string;
  affectedContacts?: string[];
}

export interface CampaignValidationWarning {
  code: string;
  message: string;
  count?: number;
}

export interface CampaignValidation {
  valid: boolean;
  errors: CampaignValidationError[];
  warnings: CampaignValidationWarning[];
  contactCount: number;
}

// Template variable mapping types
export type TemplateVariableSource =
  | { type: 'fixed_field'; field: 'numero' | 'nombre' }
  | { type: 'custom_field'; fieldName: string }
  | { type: 'static_value'; value: string };

export interface TemplateVariableMapping {
  position: number;        // Position: 1, 2, 3...
  variableName: string;    // Descriptive name (for UI)
  source: TemplateVariableSource;
}

export interface TemplateVariable {
  name: string;
  position: number;
}

// WhatsApp template selection for campaigns
export interface SelectedTemplate {
  id: string;
  templateId: string; // External template_id for Meta API
  name: string;
  bodyText: string;
  headerText: string | null;
  footerText: string | null;
  variables: TemplateVariable[];
}

export interface CampaignWizardState {
  // Source selection
  sourceType: ContactSourceType;

  // Import source state
  file: File | null;
  data: any[][];
  columns: string[];
  mapping: ColumnMapping;
  stats: ImportStats | null;
  importedContactIds: string[];

  // CRM source state
  crmSelection: ContactSelectionState;

  // Channel selection
  selectedChannel: 'whatsapp' | 'llamadas' | null;
  selectedWhatsAppNumberId: string | null;
  selectedWhatsAppWabaId: string | null;

  // Template selection (WhatsApp)
  selectedTemplate: SelectedTemplate | null;

  // Template variable mapping (WhatsApp)
  variableMapping: TemplateVariableMapping[];

  // Validation
  validation: CampaignValidation | null;

  // UI state
  loading: boolean;
}

// Re-export filter types
export * from './filters';
