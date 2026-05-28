import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getLastAdminGuardError, LAST_ADMIN_ERROR } from './last-admin-guard';

const countMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userTenant: {
      count: (...args: unknown[]) => countMock(...args),
    },
  },
}));

describe('getLastAdminGuardError', () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  const base = {
    tenantId: 't1',
    membership: { id: 'ut1', role: 'ADMIN' as const, status: 'ACTIVE' as const },
    userIsActive: true,
    changes: {},
  };

  it('allows demoting admin when another active admin exists', async () => {
    countMock.mockResolvedValueOnce(1);
    const err = await getLastAdminGuardError({
      ...base,
      changes: { role: 'STAFF' },
    });
    expect(err).toBeNull();
  });

  it('blocks demoting the last active admin', async () => {
    countMock.mockResolvedValueOnce(0);
    const err = await getLastAdminGuardError({
      ...base,
      changes: { role: 'STAFF' },
    });
    expect(err).toBe(LAST_ADMIN_ERROR);
  });

  it('blocks deactivating the last active admin user', async () => {
    countMock.mockResolvedValueOnce(0);
    const err = await getLastAdminGuardError({
      ...base,
      changes: { isActive: false },
    });
    expect(err).toBe(LAST_ADMIN_ERROR);
  });

  it('blocks setting last admin membership to non-active status', async () => {
    countMock.mockResolvedValueOnce(0);
    const err = await getLastAdminGuardError({
      ...base,
      changes: { status: 'PENDING' },
    });
    expect(err).toBe(LAST_ADMIN_ERROR);
  });

  it('does not block staff member changes', async () => {
    const err = await getLastAdminGuardError({
      ...base,
      membership: { id: 'ut2', role: 'STAFF', status: 'ACTIVE' },
      changes: { role: 'STAFF', status: 'REJECTED' },
    });
    expect(err).toBeNull();
    expect(countMock).not.toHaveBeenCalled();
  });
});
