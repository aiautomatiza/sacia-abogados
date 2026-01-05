/**
 * @fileoverview Integration Tests for Contact Service
 * @description Critical security tests for multi-tenant isolation in contact operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contactService from '../contact.service';
import type { UserScope } from '@/features/conversations';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock tenant utils
vi.mock('@/lib/utils/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/tenant')>('@/lib/utils/tenant');
  return {
    ...actual,
    getCurrentTenantId: vi.fn(),
    assertTenantAccess: vi.fn(),
  };
});

import { supabase } from '@/integrations/supabase/client';
import { assertTenantAccess } from '@/lib/utils/tenant';

describe('Contact Service - Multi-tenant Isolation', () => {
  const mockScope: UserScope = {
    userId: 'user-123',
    tenantId: 'tenant-abc',
    isSuperAdmin: false,
  };

  const mockContact = {
    id: 'contact-1',
    tenant_id: 'tenant-abc',
    numero: '+1234567890',
    nombre: 'John Doe',
    attributes: { email: 'john@example.com' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContact', () => {
    it('should return contact when it belongs to user tenant', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockContact,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(assertTenantAccess).mockResolvedValue(undefined);

      const contact = await contactService.getContact('contact-1', mockScope);

      expect(contact).toEqual(expect.objectContaining({
        id: 'contact-1',
        numero: '+1234567890',
        nombre: 'John Doe',
        attributes: { email: 'john@example.com' },
      }));

      // Verify tenant filtering
      const selectCall = mockFrom.mock.results[0].value.select.mock.results[0].value;
      expect(selectCall.eq).toHaveBeenCalledWith('id', 'contact-1');
      expect(selectCall.eq).toHaveBeenCalledWith('tenant_id', 'tenant-abc');

      // Verify application-level security
      expect(assertTenantAccess).toHaveBeenCalledWith('tenant-abc', mockScope, 'contact');
    });

    it('should throw error when contact belongs to different tenant', async () => {
      const otherTenantContact = { ...mockContact, tenant_id: 'tenant-xyz' };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: otherTenantContact,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(assertTenantAccess).mockRejectedValue(
        new Error('Access denied: contact does not belong to your organization')
      );

      await expect(
        contactService.getContact('contact-1', mockScope)
      ).rejects.toThrow('Access denied: contact does not belong to your organization');
    });

    it('should query with both id and tenant_id filters', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqSpy,
          single: vi.fn().mockResolvedValue({
            data: mockContact,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(assertTenantAccess).mockResolvedValue(undefined);

      await contactService.getContact('contact-1', mockScope);

      expect(mockFrom).toHaveBeenCalledWith('crm_contacts');
      expect(eqSpy).toHaveBeenCalledWith('id', 'contact-1');
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });

    it('should handle Supabase errors', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        contactService.getContact('contact-1', mockScope)
      ).rejects.toThrow('Not found');
    });
  });

  describe('updateContact', () => {
    it('should update contact with tenant filter', async () => {
      const updateData = { nombre: 'Jane Doe' };
      const updatedContact = { ...mockContact, ...updateData };

      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: eqSpy,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: updatedContact,
            error: null,
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);
      vi.mocked(assertTenantAccess).mockResolvedValue(undefined);

      const result = await contactService.updateContact('contact-1', updateData, mockScope);

      expect(result.nombre).toBe('Jane Doe');
      expect(eqSpy).toHaveBeenCalledWith('id', 'contact-1');
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
      expect(assertTenantAccess).toHaveBeenCalledWith('tenant-abc', mockScope, 'contact');
    });

    it('should handle unique constraint violations', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await expect(
        contactService.updateContact('contact-1', { numero: '+9999999999' }, mockScope)
      ).rejects.toThrow('Contact with phone number +9999999999 already exists');
    });

    it('should validate input with Zod', async () => {
      // Invalid data should be rejected before DB query
      await expect(
        contactService.updateContact('contact-1', {} as any, mockScope)
      ).rejects.toThrow();
    });

    it('should not call database if validation fails', async () => {
      const mockFrom = vi.fn();
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      try {
        await contactService.updateContact('contact-1', {} as any, mockScope);
      } catch (e) {
        // Expected to fail validation
      }

      // Database should not be called
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('deleteContact', () => {
    it('should delete contact with tenant filter', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqSpy,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await contactService.deleteContact('contact-1', mockScope);

      expect(mockFrom).toHaveBeenCalledWith('crm_contacts');
      expect(eqSpy).toHaveBeenCalledWith('id', 'contact-1');
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });

    it('should handle deletion errors', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
        }),
      });

      // Simulate error by making eq() return a promise that rejects
      vi.mocked(supabase.from).mockImplementation(() => {
        const chain = {
          delete: () => chain,
          eq: () => Promise.reject(new Error('Delete failed')),
        };
        return chain as any;
      });

      await expect(
        contactService.deleteContact('contact-1', mockScope)
      ).rejects.toThrow('Delete failed');
    });

    it('should only delete contacts from current tenant', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: eqSpy,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await contactService.deleteContact('contact-1', mockScope);

      // Verify BOTH id and tenant_id filters are applied
      expect(eqSpy).toHaveBeenCalledWith('id', 'contact-1');
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });
  });

  describe('deleteContactsBulk', () => {
    it('should delete multiple contacts with tenant filter', async () => {
      const ids = ['contact-1', 'contact-2', 'contact-3'];

      const inSpy = vi.fn().mockReturnThis();
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          in: inSpy,
          eq: eqSpy,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await contactService.deleteContactsBulk(ids, mockScope);

      expect(mockFrom).toHaveBeenCalledWith('crm_contacts');
      expect(inSpy).toHaveBeenCalledWith('id', ids);
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });

    it('should handle empty array', async () => {
      const inSpy = vi.fn().mockReturnThis();
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          in: inSpy,
          eq: eqSpy,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await contactService.deleteContactsBulk([], mockScope);

      expect(inSpy).toHaveBeenCalledWith('id', []);
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });

    it('should apply tenant filter even with many IDs', async () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `contact-${i}`);

      const inSpy = vi.fn().mockReturnThis();
      const eqSpy = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          in: inSpy,
          eq: eqSpy,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await contactService.deleteContactsBulk(manyIds, mockScope);

      expect(inSpy).toHaveBeenCalledWith('id', manyIds);
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
    });

    it('should handle bulk delete errors', async () => {
      const ids = ['contact-1', 'contact-2'];

      vi.mocked(supabase.from).mockImplementation(() => {
        const chain = {
          delete: () => chain,
          in: () => chain,
          eq: () => Promise.reject(new Error('Bulk delete failed')),
        };
        return chain as any;
      });

      await expect(
        contactService.deleteContactsBulk(ids, mockScope)
      ).rejects.toThrow('Bulk delete failed');
    });
  });

  describe('Security verification', () => {
    it('should never allow operations without tenant_id filter', async () => {
      // This test ensures that all operations include tenant_id
      const operations = [
        { name: 'getContact', fn: () => contactService.getContact('id', mockScope) },
        { name: 'updateContact', fn: () => contactService.updateContact('id', { nombre: 'Test' }, mockScope) },
        { name: 'deleteContact', fn: () => contactService.deleteContact('id', mockScope) },
        { name: 'deleteContactsBulk', fn: () => contactService.deleteContactsBulk(['id'], mockScope) },
      ];

      for (const op of operations) {
        const eqSpy = vi.fn().mockReturnThis();
        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ eq: eqSpy, single: vi.fn().mockResolvedValue({ data: mockContact, error: null }) }),
          update: vi.fn().mockReturnValue({ eq: eqSpy, select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockContact, error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: eqSpy, in: eqSpy }),
        });

        vi.mocked(supabase.from).mockImplementation(mockFrom);
        vi.mocked(assertTenantAccess).mockResolvedValue(undefined);

        try {
          await op.fn();
        } catch (e) {
          // Some operations may fail for other reasons, but tenant check should always happen
        }

        // Verify tenant_id was checked
        expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'tenant-abc');
      }
    });
  });
});
