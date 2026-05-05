import { getServerSession } from 'next-auth';
import { authOptions, type SessionRoleAssignment } from '@/lib/auth';

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

  const tenantId = session.primaryTenantId;
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

