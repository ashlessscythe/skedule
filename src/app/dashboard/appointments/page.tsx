import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { CreateAppointmentDialog } from './ui/create-appointment-dialog';
import { AppointmentsList, type AppointmentRow } from './ui/appointments-list';
import { getUtcWeekRange } from '@/lib/utc-week';

function AppointmentsListFallback() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg border bg-muted/40" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-muted/40" />
      <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
}

export default async function AppointmentsPage() {
  const ctx = await getTenantContext();
  const { start: weekStart, end: weekEnd } = getUtcWeekRange(new Date());

  const [locations, clients, staffUsers, types, appointments] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
      take: 200,
    }),
    prisma.userTenant.findMany({
      where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
      select: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.appointmentType.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, durationMinutes: true },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        startTime: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { startTime: 'asc' },
      include: {
        location: { select: { name: true, timeZone: true } },
        client: { select: { firstName: true, lastName: true, email: true } },
        staff: { select: { firstName: true, lastName: true, email: true } },
        type: { select: { name: true, durationMinutes: true } },
      },
    }),
  ]);

  const rows: AppointmentRow[] = appointments.map((a) => ({
    id: a.id,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    status: a.status,
    locationId: a.locationId,
    locationName: a.location.name,
    locationTimeZone: a.location.timeZone,
    clientId: a.clientId,
    clientFirstName: a.client.firstName,
    clientLastName: a.client.lastName,
    clientEmail: a.client.email,
    staffId: a.staffId,
    staffFirstName: a.staff?.firstName ?? null,
    staffLastName: a.staff?.lastName ?? null,
    typeId: a.typeId,
    typeName: a.type?.name ?? null,
    typeDurationMinutes: a.type?.durationMinutes ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            This calendar week (UTC boundaries). Times are shown in each location&apos;s timezone.
            Filter, sort, and paginate below — defaults to upcoming only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/clients" className={buttonVariants({ variant: 'outline' })}>
            New client
          </Link>
          <CreateAppointmentDialog
            locations={locations.map((l) => ({ id: l.id, label: l.name }))}
            clients={clients.map((c) => ({
              id: c.id,
              label: `${c.lastName}, ${c.firstName}`,
            }))}
            staff={staffUsers
              .map((s) => s.user)
              .filter(Boolean)
              .map((u) => ({
                id: u!.id,
                label: `${u!.firstName} ${u!.lastName}`.trim() || u!.email,
              }))}
            types={types.map((t) => ({
              id: t.id,
              label: t.name,
              durationMinutes: t.durationMinutes,
            }))}
          />
        </div>
      </div>

      <Suspense fallback={<AppointmentsListFallback />}>
        <AppointmentsList
          rows={rows}
          locationOptions={locations.map((l) => ({ id: l.id, label: l.name }))}
          clientOptions={clients.map((c) => ({
            id: c.id,
            label: `${c.lastName}, ${c.firstName}`,
          }))}
          staffOptions={staffUsers
            .map((s) => s.user)
            .filter(Boolean)
            .map((u) => ({
              id: u!.id,
              label: `${u!.firstName} ${u!.lastName}`.trim() || u!.email,
            }))}
          typeOptions={types.map((t) => ({ id: t.id, label: t.name }))}
        />
      </Suspense>
    </div>
  );
}
