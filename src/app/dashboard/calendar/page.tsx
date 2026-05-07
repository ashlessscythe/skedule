import { prisma } from '@/lib/prisma';
import { getTenantContext, requireStaffOrAdmin } from '@/lib/tenant-context';
import { redirect } from 'next/navigation';
import { CalendarView } from './ui/calendar-view';

export default async function CalendarPage() {
  const ctx = await getTenantContext();
  try {
    requireStaffOrAdmin(ctx);
  } catch {
    redirect('/dashboard');
  }

  const [locations, staffUsers] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, timeZone: true },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE', role: { in: ['STAFF', 'ADMIN'] } },
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
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Weekly view of availability and scheduled appointments for your active tenant.
        </p>
      </div>

      <div className="mt-6">
        <CalendarView
          locations={locations}
          staff={staff}
          viewerRole={ctx.role}
          initialNowIso={new Date().toISOString()}
        />
      </div>
    </div>
  );
}

