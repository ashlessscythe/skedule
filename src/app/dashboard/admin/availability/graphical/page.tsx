import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { AvailabilityGraphicalView } from './ui/availability-graphical-view';

export default async function AdminAvailabilityGraphicalPage() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const [locations, staffUsers] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, timeZone: true },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE', role: 'STAFF' },
      select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
  ]);

  const staff = staffUsers
    .map((s) => s.user)
    .filter(Boolean)
    .map((u) => ({
      id: u!.id,
      label: `${u!.firstName} ${u!.lastName}`.trim() || u!.email,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <AvailabilityGraphicalView
      locations={locations}
      staff={staff}
      initialNowIso={new Date().toISOString()}
    />
  );
}
