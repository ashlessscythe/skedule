import { describe, expect, it, vi } from 'vitest';
import { getTenantContext, requireAdmin } from './tenant-context';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('getTenantContext', () => {
  it('throws Unauthorized when no session', async () => {
    const { getServerSession } = await import('next-auth');
    vi.mocked(getServerSession as any).mockResolvedValue(null);

    await expect(getTenantContext()).rejects.toThrow(/Unauthorized/);
  });

  it('throws Forbidden when primary tenant not in roles', async () => {
    const { getServerSession } = await import('next-auth');
    vi.mocked(getServerSession as any).mockResolvedValue({
      userId: 'u1',
      primaryTenantId: 't-missing',
      roles: [{ tenantId: 't1', role: 'STAFF' }],
    });

    await expect(getTenantContext()).rejects.toThrow(/Forbidden/);
  });

  it('returns tenantId + role for primaryTenantId', async () => {
    const { getServerSession } = await import('next-auth');
    vi.mocked(getServerSession as any).mockResolvedValue({
      userId: 'u1',
      primaryTenantId: 't1',
      roles: [
        { tenantId: 't1', role: 'ADMIN' },
        { tenantId: 't2', role: 'STAFF' },
      ],
    });

    const ctx = await getTenantContext();
    expect(ctx.userId).toBe('u1');
    expect(ctx.tenantId).toBe('t1');
    expect(ctx.role).toBe('ADMIN');
    expect(ctx.allTenantIds).toEqual(['t1', 't2']);
  });
});

describe('requireAdmin', () => {
  it('throws when not admin', () => {
    expect(() =>
      requireAdmin({
        userId: 'u',
        tenantId: 't',
        role: 'STAFF',
        allTenantIds: ['t'],
        roles: [{ tenantId: 't', role: 'STAFF' }],
      })
    ).toThrow(/Forbidden/);
  });
});

