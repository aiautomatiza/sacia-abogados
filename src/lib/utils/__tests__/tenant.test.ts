/**
 * @fileoverview Tests for Tenant Utilities
 * @description Critical security tests for multi-tenant isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  assertTenantAccess,
  getCurrentTenantId,
  getCurrentUserScope,
  validateTenantAccess,
} from '../tenant';
import type { UserScope } from '@/features/conversations';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('assertTenantAccess', () => {
  const mockScope: UserScope = {
    userId: 'user-123',
    tenantId: 'tenant-abc',
    isSuperAdmin: false,
  };

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should allow access when resource belongs to user tenant', async () => {
    await expect(
      assertTenantAccess('tenant-abc', mockScope, 'contact')
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should throw error when resource belongs to different tenant', async () => {
    await expect(
      assertTenantAccess('tenant-xyz', mockScope, 'contact')
    ).rejects.toThrow('Access denied: contact does not belong to your organization');
  });

  it('should log security violation when tenant mismatch detected', async () => {
    try {
      await assertTenantAccess('tenant-xyz', mockScope, 'contact');
      // Should not reach here
      expect.fail('Expected to throw error');
    } catch (e) {
      // Expected to throw
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[SECURITY] Tenant isolation violation detected',
      expect.objectContaining({
        userId: 'user-123',
        userTenantId: 'tenant-abc',
        resourceTenantId: 'tenant-xyz',
        resourceType: 'contact',
        timestamp: expect.any(String),
      })
    );
  });

  it('should allow super admin to access any tenant', async () => {
    const superAdminScope: UserScope = {
      ...mockScope,
      isSuperAdmin: true,
    };

    await expect(
      assertTenantAccess('tenant-xyz', superAdminScope, 'contact')
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should work with different resource types', async () => {
    const resourceTypes = ['contact', 'conversation', 'message', 'campaign', 'call'];

    for (const resourceType of resourceTypes) {
      await expect(
        assertTenantAccess('tenant-abc', mockScope, resourceType)
      ).resolves.not.toThrow();
    }
  });
});

describe('getCurrentTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return tenant_id for authenticated user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-abc' },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const tenantId = await getCurrentTenantId();
    expect(tenantId).toBe('tenant-abc');
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('should throw error when auth fails', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' } as any,
    });

    await expect(getCurrentTenantId()).rejects.toThrow('Authentication error: Not authenticated');
  });

  it('should throw error when user is not authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(getCurrentTenantId()).rejects.toThrow('No authenticated user');
  });

  it('should throw error when profile fetch fails', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    await expect(getCurrentTenantId()).rejects.toThrow('Failed to fetch profile: Profile not found');
  });

  it('should throw error when profile has no tenant_id', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: null },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    await expect(getCurrentTenantId()).rejects.toThrow(
      'User profile has no tenant_id. Please contact support.'
    );
  });

  it('should throw error when profile tenant_id is undefined', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    await expect(getCurrentTenantId()).rejects.toThrow(
      'User profile has no tenant_id. Please contact support.'
    );
  });
});

describe('getCurrentUserScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return complete user scope with tenant and role', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { tenant_id: 'tenant-abc' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'user_client' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const scope = await getCurrentUserScope();

    expect(scope).toEqual({
      userId: 'user-123',
      tenantId: 'tenant-abc',
      isSuperAdmin: false,
    });
  });

  it('should identify super admin correctly', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'admin-456' } as any },
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { tenant_id: 'tenant-xyz' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'super_admin' },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const scope = await getCurrentUserScope();

    expect(scope.isSuperAdmin).toBe(true);
  });

  it('should handle missing role gracefully', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { tenant_id: 'tenant-abc' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const scope = await getCurrentUserScope();

    expect(scope.isSuperAdmin).toBe(false);
  });
});

describe('validateTenantAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when tenant matches current user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-abc' },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const result = await validateTenantAccess('tenant-abc');
    expect(result).toBe(true);
  });

  it('should return false when tenant does not match', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } as any },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-abc' },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const result = await validateTenantAccess('tenant-xyz');
    expect(result).toBe(false);
  });

  it('should return false when getCurrentTenantId throws error', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await validateTenantAccess('tenant-abc');
    expect(result).toBe(false);
  });
});
