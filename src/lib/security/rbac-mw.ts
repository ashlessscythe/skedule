import type { JWT } from 'next-auth/jwt';

export function isAdminForPrimaryTenant(token: JWT | null | undefined): boolean {
  if (!token?.primaryTenantId) return false;
  const roles = token.roles ?? [];
  return roles.some((r) => r.tenantId === token.primaryTenantId && r.role === 'ADMIN');
}

