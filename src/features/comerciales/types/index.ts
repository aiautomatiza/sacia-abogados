import type { ComercialRole } from '@/types/comercial';

export interface Comercial {
  id: string;
  email: string;
  full_name: string | null;
  comercial_role: ComercialRole | null;
  location_id: string | null;
  tenant_id: string | null;
  external_id: string | null;
  location_name?: string | null;
}

export interface UpdateComercialRoleInput {
  userId: string;
  comercialRole: ComercialRole | null;
  locationId?: string | null;
  externalId?: string | null;
}

export interface InviteComercialInput {
  email: string;
  full_name: string;
  comercial_role: ComercialRole;
  location_id?: string | null;
  external_id: string;
  tenant_id: string;
}

export interface AssignContactInput {
  contactId: string;
  assignedTo: string | null;
  locationId?: string | null;
}
