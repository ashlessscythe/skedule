import type { JWT } from 'next-auth/jwt';

export const ACTIVE_TENANT_COOKIE = 'skedule_active_tenant';

export function isAdminForPrimaryTenant(token: JWT | null | undefined): boolean {
  if (!token?.primaryTenantId) return false;
  const roles = token.roles ?? [];
  return roles.some((r) => r.tenantId === token.primaryTenantId && r.role === 'ADMIN');
}

export function getActiveTenantIdFromCookie(cookieValue: string | undefined | null) {
  const v = (cookieValue ?? '').trim();
  return v.length ? v : null;
}

export function canAccessTenant(token: JWT | null | undefined, tenantId: string | null) {
  if (!tenantId) return false;
  const roles = token?.roles ?? [];
  return roles.some((r) => r.tenantId === tenantId);
}

export function isAdminForTenant(token: JWT | null | undefined, tenantId: string | null) {
  if (!tenantId) return false;
  const roles = token?.roles ?? [];
  return roles.some((r) => r.tenantId === tenantId && r.role === 'ADMIN');
}

