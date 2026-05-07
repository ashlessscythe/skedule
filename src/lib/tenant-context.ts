import { getServerSession } from 'next-auth';
import { authOptions, type SessionRoleAssignment } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  ACTIVE_TENANT_COOKIE,
  getActiveTenantIdFromCookie,
} from '@/lib/security/rbac-mw';

export type TenantContext = {
  userId: string;
  tenantId: string;
  role: SessionRoleAssignment['role'];
  allTenantIds: string[];
  roles: SessionRoleAssignment[];
};

export async function getTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');

  let cookieTenantId: string | null = null;
  try {
    const cookieStore = await cookies();
    cookieTenantId = getActiveTenantIdFromCookie(cookieStore.get(ACTIVE_TENANT_COOKIE)?.value);
  } catch {
    cookieTenantId = null;
  }
  const tenantId =
    cookieTenantId && session.roles.some((r) => r.tenantId === cookieTenantId)
      ? cookieTenantId
      : session.primaryTenantId;
  const roleAssignment = session.roles.find((r) => r.tenantId === tenantId);
  if (!roleAssignment) throw new Error('Forbidden');

  return {
    userId: session.userId,
    tenantId,
    role: roleAssignment.role,
    allTenantIds: session.roles.map((r) => r.tenantId),
    roles: session.roles,
  };
}

export function requireAdmin(ctx: TenantContext) {
  if (ctx.role !== 'ADMIN') throw new Error('Forbidden');
}

