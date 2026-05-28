import { prisma } from '@/lib/prisma';

export type LastAdminGuardInput = {
  tenantId: string;
  membership: {
    id: string;
    role: 'ADMIN' | 'STAFF';
    status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  };
  userIsActive: boolean;
  changes: {
    role?: 'ADMIN' | 'STAFF';
    status?: 'ACTIVE' | 'PENDING' | 'REJECTED';
    isActive?: boolean;
  };
};

export const LAST_ADMIN_ERROR =
  'Cannot remove the last active administrator for this organization.';

function willRemainActiveAdmin(input: LastAdminGuardInput): boolean {
  const role = input.changes.role ?? input.membership.role;
  const status = input.changes.status ?? input.membership.status;
  const isActive = input.changes.isActive ?? input.userIsActive;
  return role === 'ADMIN' && status === 'ACTIVE' && isActive;
}

function isCurrentlyActiveAdmin(input: LastAdminGuardInput): boolean {
  return (
    input.membership.role === 'ADMIN' &&
    input.membership.status === 'ACTIVE' &&
    input.userIsActive
  );
}

/** Returns an error message when the change would leave the tenant without an active admin. */
export async function getLastAdminGuardError(
  input: LastAdminGuardInput
): Promise<string | null> {
  if (!isCurrentlyActiveAdmin(input)) return null;
  if (willRemainActiveAdmin(input)) return null;

  const otherActiveAdmins = await prisma.userTenant.count({
    where: {
      tenantId: input.tenantId,
      id: { not: input.membership.id },
      role: 'ADMIN',
      status: 'ACTIVE',
      user: { isActive: true },
    },
  });

  return otherActiveAdmins === 0 ? LAST_ADMIN_ERROR : null;
}
