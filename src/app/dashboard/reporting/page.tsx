import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import {
  computeNoShowRate,
  computeUtilization,
  countWeekdayOccurrencesInUtcDateRangeInclusive,
  minutesBetweenLocalTimes,
} from '@/lib/reporting-metrics';

export default async function ReportingPage() {
  const ctx = await getTenantContext();

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseWhere = {
    tenantId: ctx.tenantId,
    deletedAt: null as null,
    startTime: { gte: start, lte: end },
  };

  const [total, noShows, completed, scheduled] = await Promise.all([
    prisma.appointment.count({ where: baseWhere }),
    prisma.appointment.count({ where: { ...baseWhere, status: 'NO_SHOW' } }),
    prisma.appointment.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { ...baseWhere, status: 'SCHEDULED' } }),
  ]);

  const noShowRate = computeNoShowRate({ completedCount: completed, noShowCount: noShows });

  const apptsForMinutes = await prisma.appointment.findMany({
    where: { ...baseWhere, status: { not: 'CANCELLED' } },
    select: { staffId: true, locationId: true, startTime: true, endTime: true, status: true },
  });

  const bookedMinutesTotal = apptsForMinutes.reduce((sum, a) => {
    const minutes = Math.max(0, Math.round((a.endTime.getTime() - a.startTime.getTime()) / 60000));
    return sum + minutes;
  }, 0);

  const availabilities = await prisma.availability.findMany({
    where: { tenantId: ctx.tenantId, isBlocked: false },
    select: {
      id: true,
      locationId: true,
      staffId: true,
      dayOfWeek: true,
      startTimeLocal: true,
      endTimeLocal: true,
      specificDate: true,
    },
  });

  const startDateUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDateUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  const availabilityMinutesTotal = availabilities.reduce((sum, a) => {
    if (!a.startTimeLocal || !a.endTimeLocal) return sum;
    const minutesPerSlot = minutesBetweenLocalTimes({
      startTimeLocal: a.startTimeLocal,
      endTimeLocal: a.endTimeLocal,
    });
    if (minutesPerSlot <= 0) return sum;

    if (a.specificDate) {
      if (a.specificDate >= start && a.specificDate <= end) return sum + minutesPerSlot;
      return sum;
    }

    if (a.dayOfWeek === null || a.dayOfWeek === undefined) return sum;
    const occurrences = countWeekdayOccurrencesInUtcDateRangeInclusive({
      startDateUtc,
      endDateUtc,
      dayOfWeek: a.dayOfWeek,
    });
    return sum + occurrences * minutesPerSlot;
  }, 0);

  const utilization = computeUtilization({
    bookedMinutes: bookedMinutesTotal,
    availableMinutes: availabilityMinutesTotal,
  });

  const bookedByStaff = new Map<string, number>();
  const bookedByLocation = new Map<string, number>();
  for (const a of apptsForMinutes) {
    const minutes = Math.max(0, Math.round((a.endTime.getTime() - a.startTime.getTime()) / 60000));
    if (minutes <= 0) continue;
    if (a.staffId) bookedByStaff.set(a.staffId, (bookedByStaff.get(a.staffId) ?? 0) + minutes);
    bookedByLocation.set(a.locationId, (bookedByLocation.get(a.locationId) ?? 0) + minutes);
  }

  const availableByStaff = new Map<string, number>();
  const availableByLocation = new Map<string, number>();
  for (const a of availabilities) {
    if (!a.startTimeLocal || !a.endTimeLocal) continue;
    const minutesPerSlot = minutesBetweenLocalTimes({
      startTimeLocal: a.startTimeLocal,
      endTimeLocal: a.endTimeLocal,
    });
    if (minutesPerSlot <= 0) continue;

    let occurrences = 0;
    if (a.specificDate) {
      occurrences = a.specificDate >= start && a.specificDate <= end ? 1 : 0;
    } else if (a.dayOfWeek !== null && a.dayOfWeek !== undefined) {
      occurrences = countWeekdayOccurrencesInUtcDateRangeInclusive({
        startDateUtc,
        endDateUtc,
        dayOfWeek: a.dayOfWeek,
      });
    }
    if (occurrences <= 0) continue;
    const minutes = occurrences * minutesPerSlot;

    availableByLocation.set(a.locationId, (availableByLocation.get(a.locationId) ?? 0) + minutes);
    if (a.staffId) availableByStaff.set(a.staffId, (availableByStaff.get(a.staffId) ?? 0) + minutes);
  }

  const [locations, staff] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenants: { some: { tenantId: ctx.tenantId, status: 'ACTIVE' } } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ]);

  const staffRows = staff
    .map((u) => {
      const bookedMinutes = bookedByStaff.get(u.id) ?? 0;
      const availableMinutes = availableByStaff.get(u.id) ?? 0;
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim() || u.email,
        bookedMinutes,
        availableMinutes,
        utilization: computeUtilization({ bookedMinutes, availableMinutes }),
      };
    })
    .filter((r) => r.bookedMinutes > 0 || r.availableMinutes > 0)
    .sort((a, b) => b.utilization - a.utilization);

  const locationRows = locations
    .map((l) => {
      const bookedMinutes = bookedByLocation.get(l.id) ?? 0;
      const availableMinutes = availableByLocation.get(l.id) ?? 0;
      return {
        id: l.id,
        name: l.name,
        bookedMinutes,
        availableMinutes,
        utilization: computeUtilization({ bookedMinutes, availableMinutes }),
      };
    })
    .filter((r) => r.bookedMinutes > 0 || r.availableMinutes > 0)
    .sort((a, b) => b.utilization - a.utilization);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
        <p className="text-sm text-muted-foreground">
          Basic metrics for the active tenant (last 30 days).
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

      <div className="mt-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">Metric definitions and assumptions</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">No-show rate</span> is calculated as{' '}
            <span className="font-mono text-foreground">NO_SHOW / (COMPLETED + NO_SHOW)</span> in the
            date window (cancellations excluded from the denominator).
          </li>
          <li>
            <span className="font-medium text-foreground">Utilization</span> is{' '}
            <span className="font-mono text-foreground">bookedMinutes / availableMinutes</span>. Booked
            minutes include non-cancelled appointments (scheduled, completed, no-show) whose start time
            is inside the date window.
          </li>
          <li>
            Availability minutes are estimated from availability rows. Recurring rows (with{' '}
            <span className="font-mono text-foreground">dayOfWeek</span>) are expanded by counting weekday
            occurrences in the UTC date range; per-location time zones are not applied.
          </li>
        </ul>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Booked minutes</div>
          <div className="mt-1 text-2xl font-semibold">{bookedMinutesTotal}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Available minutes</div>
          <div className="mt-1 text-2xl font-semibold">{availabilityMinutesTotal}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Utilization</div>
          <div className="mt-1 text-2xl font-semibold">{(utilization * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-lg font-semibold tracking-tight">By staff</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="h-10 px-2 text-left font-medium">Staff</th>
                  <th className="h-10 px-2 text-right font-medium">Booked</th>
                  <th className="h-10 px-2 text-right font-medium">Available</th>
                  <th className="h-10 px-2 text-right font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.length ? (
                  staffRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right">{r.bookedMinutes}</td>
                      <td className="p-2 text-right">{r.availableMinutes}</td>
                      <td className="p-2 text-right">{(r.utilization * 100).toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={4}>
                      No staff utilization data for this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="text-lg font-semibold tracking-tight">By location</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="h-10 px-2 text-left font-medium">Location</th>
                  <th className="h-10 px-2 text-right font-medium">Booked</th>
                  <th className="h-10 px-2 text-right font-medium">Available</th>
                  <th className="h-10 px-2 text-right font-medium">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {locationRows.length ? (
                  locationRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right">{r.bookedMinutes}</td>
                      <td className="p-2 text-right">{r.availableMinutes}</td>
                      <td className="p-2 text-right">{(r.utilization * 100).toFixed(1)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={4}>
                      No location utilization data for this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

