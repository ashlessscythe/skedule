import { describe, expect, it } from 'vitest';
import type { JWT } from 'next-auth/jwt';
import { isAdminForPrimaryTenant } from './rbac-mw';

describe('isAdminForPrimaryTenant', () => {
  it('returns false for missing token', () => {
    expect(isAdminForPrimaryTenant(null)).toBe(false);
    expect(isAdminForPrimaryTenant(undefined)).toBe(false);
  });

  it('returns false when no primaryTenantId', () => {
    expect(isAdminForPrimaryTenant({ roles: [] } as JWT)).toBe(false);
  });

  it('returns false when not admin for primary tenant', () => {
    expect(
      isAdminForPrimaryTenant({
        primaryTenantId: 't1',
        roles: [{ tenantId: 't1', role: 'STAFF' }],
      } as JWT)
    ).toBe(false);
  });

  it('returns true when admin for primary tenant', () => {
    expect(
      isAdminForPrimaryTenant({
        primaryTenantId: 't1',
        roles: [
          { tenantId: 't2', role: 'ADMIN' },
          { tenantId: 't1', role: 'ADMIN' },
        ],
      } as JWT)
    ).toBe(true);
  });
});

