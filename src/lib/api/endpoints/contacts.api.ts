/**
 * @fileoverview Contacts API Endpoints
 * @description Type-safe wrappers for Contacts API Gateway endpoints
 */

import { apiRequest } from '../client';

/**
 * Contact type definition
 */
export interface Contact {
  id: string;
  tenant_id: string;
  numero: string;
  nombre: string | null;
  attributes: Record<string, any>;
  status_id: string | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated contacts response
 */
export interface ContactsResponse {
  data: Contact[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Contact filters for search and pagination
 */
export interface ContactFilters {
  search?: string;
  status_ids?: string[]; // Filter by status IDs (multi-select)
  page?: number;
  pageSize?: number;
}

/**
 * Create Contact input
 */
export interface CreateContactInput {
  numero: string;
  nombre?: string;
  attributes?: Record<string, any>;
  status_id?: string; // Optional: status to assign on creation
  skip_external_sync?: boolean;
}

/**
 * Update Contact input
 */
export interface UpdateContactInput {
  numero?: string;
  nombre?: string;
  attributes?: Record<string, any>;
  status_id?: string | null; // Optional: update contact status
}

/**
 * Get paginated list of contacts with optional search
 *
 * @param filters - Search and pagination filters
 * @returns Paginated contacts response
 */
export async function getContacts(filters: ContactFilters = {}): Promise<ContactsResponse> {
  const params: Record<string, string> = {};

  if (filters.search) {
    params.search = filters.search;
  }
  if (filters.status_ids && filters.status_ids.length > 0) {
    // Send as comma-separated string
    params.status_ids = filters.status_ids.join(',');
  }
  if (filters.page) {
    params.page = filters.page.toString();
  }
  if (filters.pageSize) {
    params.pageSize = filters.pageSize.toString();
  }

  return apiRequest<ContactsResponse>('/api/contacts', {
    method: 'GET',
    params,
  });
}

/**
 * Get a single contact by ID
 *
 * @param id - Contact ID
 * @returns Contact data
 */
export async function getContact(id: string): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`, {
    method: 'GET',
  });
}

/**
 * Create a new contact
 * - Normalizes phone number to E.164 format (Spanish numbers)
 * - Checks for duplicates (tenant + numero)
 * - Notifies external middleware if tenant has active integrations
 *
 * @param contact - Contact data
 * @returns Created contact
 */
export async function createContact(contact: CreateContactInput): Promise<Contact> {
  return apiRequest<Contact>('/api/contacts', {
    method: 'POST',
    body: contact,
  });
}

/**
 * Update an existing contact
 *
 * @param id - Contact ID
 * @param updates - Partial contact updates
 * @returns Updated contact
 */
export async function updateContact(id: string, updates: UpdateContactInput): Promise<Contact> {
  return apiRequest<Contact>(`/api/contacts/${id}`, {
    method: 'PATCH',
    body: updates,
  });
}

/**
 * Delete a contact
 *
 * @param id - Contact ID
 * @returns Success response
 */
export async function deleteContact(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/contacts/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Delete multiple contacts in bulk
 *
 * @param ids - Array of contact IDs (1-100)
 * @returns Success response with deleted count
 */
export async function deleteContactsBulk(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  return apiRequest<{ success: boolean; deletedCount: number }>('/api/contacts/bulk-delete', {
    method: 'POST',
    body: { ids },
  });
}
