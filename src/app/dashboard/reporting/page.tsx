import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';

export default async function ReportingPage() {
  const ctx = await getTenantContext();

  const total = await prisma.appointment.count({
    where: { tenantId: ctx.tenantId, deletedAt: null },
  });
  const noShows = await prisma.appointment.count({
    where: { tenantId: ctx.tenantId, deletedAt: null, status: 'NO_SHOW' },
  });
  const completed = await prisma.appointment.count({
    where: { tenantId: ctx.tenantId, deletedAt: null, status: 'COMPLETED' },
  });
  const scheduled = await prisma.appointment.count({
    where: { tenantId: ctx.tenantId, deletedAt: null, status: 'SCHEDULED' },
  });

  const noShowRate = scheduled > 0 ? noShows / scheduled : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Basic metrics for the active tenant.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total appointments</div>
          <div className="mt-1 text-2xl font-semibold">{total}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Scheduled</div>
          <div className="mt-1 text-2xl font-semibold">{scheduled}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="mt-1 text-2xl font-semibold">{completed}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">No-show rate</div>
          <div className="mt-1 text-2xl font-semibold">
            {(noShowRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

