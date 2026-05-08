import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { CreateStaffMemberDialog } from './ui/create-staff-member-dialog';
import { StaffList, type StaffRow } from './ui/staff-list';

export default async function AdminStaffPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const membersRaw = await prisma.userTenant.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }], // kept stable; client controls override display order
  });

  const members: StaffRow[] = membersRaw.map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    user: {
      id: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      isActive: m.user.isActive,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and permissions for the active tenant.
          </p>
        </div>
        <CreateStaffMemberDialog />
      </div>

      <StaffList rows={members} />
    </div>
  );
}

