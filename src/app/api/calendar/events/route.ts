import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireStaffOrAdmin } from '@/lib/tenant-context';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';

const QuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  locationId: z.string().optional(),
  staffId: z.string().optional(),
  includeAppointments: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v ?? 'true') === 'true'),
  includeAvailability: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v ?? 'true') === 'true'),
});

export type CalendarEvent = {
  id: string;
  kind: 'APPOINTMENT' | 'AVAILABILITY' | 'BLOCKED';
  title: string;
  startUtc: string; // ISO
  endUtc: string; // ISO
  locationId: string | null;
  staffId: string | null;
  /** Present when the API can resolve the location (e.g. availability rows). */
  locationName?: string | null;
  /** IANA zone for the event's location (appointments and location-scoped availability). */
  locationTimeZone?: string | null;
  /** Human-readable staff scope: a name, or "All staff" when the row applies to everyone. */
  staffLabel?: string | null;
};

function formatUserDisplayName(u: { firstName: string; lastName: string; email: string }) {
  const n = `${u.firstName} ${u.lastName}`.trim();
  return n || u.email;
}

function hhmmToParts(s: string) {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return { h, m };
}

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireStaffOrAdmin(ctx);

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    const q = parsed.data;

    const startUtc = new Date(q.start);
    const endUtc = new Date(q.end);
    if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime()) || startUtc >= endUtc) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }

    const locationsById = await prisma.location.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, name: true, timeZone: true },
    });
    const locationMeta = new Map(locationsById.map((l) => [l.id, l]));

    const events: CalendarEvent[] = [];

    if (q.includeAppointments) {
      const appts = await prisma.appointment.findMany({
        where: {
          tenantId: ctx.tenantId,
          deletedAt: null,
          startTime: { lt: endUtc },
          endTime: { gt: startUtc },
          ...(q.locationId ? { locationId: q.locationId } : {}),
          ...(q.staffId ? { staffId: q.staffId } : {}),
        },
        include: {
          client: { select: { firstName: true, lastName: true } },
          staff: { select: { firstName: true, lastName: true, email: true } },
          type: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 500,
      });

      for (const a of appts) {
        const clientName = `${a.client.firstName} ${a.client.lastName}`.trim();
        const typeName = a.type?.name?.trim() || 'Appointment';
        const staffName = a.staff ? formatUserDisplayName(a.staff) : 'Unassigned';
        events.push({
          id: a.id,
          kind: 'APPOINTMENT',
          title: `${typeName} — ${clientName} (${staffName})`,
          startUtc: a.startTime.toISOString(),
          endUtc: a.endTime.toISOString(),
          locationId: a.locationId,
          staffId: a.staffId ?? null,
          locationName: locationMeta.get(a.locationId)?.name ?? null,
          locationTimeZone: locationMeta.get(a.locationId)?.timeZone ?? null,
          staffLabel: a.staff ? staffName : 'Unassigned',
        });
      }
    }

    if (q.includeAvailability) {
      // Assumption (minimal): availability windows are defined in a *location* timezone.
      // If a location isn't selected, we can't reliably project weekly windows.
      const locationId = q.locationId ?? null;
      const loc = locationId ? locationMeta.get(locationId) : null;
      if (!loc) {
        return NextResponse.json(
          {
            events,
            warnings: ['Availability requires a location filter to determine timezone.'],
          },
          { status: 200 }
        );
      }

      const tz = loc.timeZone;

      const availRows = await prisma.availability.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(locationId ? { locationId } : {}),
          ...(q.staffId ? { staffId: q.staffId } : {}),
        },
        orderBy: [{ specificDate: 'asc' }, { dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
        take: 2000,
      });

      const availStaffIds = [
        ...new Set(availRows.map((r) => r.staffId).filter((id): id is string => Boolean(id))),
      ];
      const availStaffUsers =
        availStaffIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: availStaffIds } },
              select: { id: true, firstName: true, lastName: true, email: true },
            })
          : [];
      const availStaffNameById = new Map(
        availStaffUsers.map((u) => [u.id, formatUserDisplayName(u)])
      );

      const startDayKey = formatInTimeZone(startUtc, tz, 'yyyy-MM-dd');
      const startLocalMidnightUtc = fromZonedTime(`${startDayKey}T00:00:00`, tz);

      const maxDays = 14; // safety for accidental large ranges
      for (let i = 0; i < maxDays; i++) {
        const dayStartUtc = addDays(startLocalMidnightUtc, i);
        if (dayStartUtc >= endUtc) break;

        const dayKey = formatInTimeZone(dayStartUtc, tz, 'yyyy-MM-dd');
        const dayLocal = toZonedTime(dayStartUtc, tz);
        const dow = dayLocal.getDay(); // 0-6

        for (const r of availRows) {
          if (r.specificDate) {
            const d = formatInTimeZone(r.specificDate, tz, 'yyyy-MM-dd');
            if (d !== dayKey) continue;
            events.push({
              id: r.id,
              kind: r.isBlocked ? 'BLOCKED' : 'AVAILABILITY',
              title: r.isBlocked ? 'Blocked' : 'Available',
              startUtc: fromZonedTime(`${dayKey}T00:00:00`, tz).toISOString(),
              endUtc: fromZonedTime(`${dayKey}T23:59:59`, tz).toISOString(),
              locationId,
              staffId: r.staffId ?? null,
              locationName: loc.name,
              locationTimeZone: tz,
              staffLabel: r.staffId
                ? (availStaffNameById.get(r.staffId) ?? r.staffId)
                : 'All staff',
            });
            continue;
          }

          if (r.dayOfWeek == null) continue;
          if (r.dayOfWeek !== dow) continue;
          if (!r.startTimeLocal || !r.endTimeLocal) continue;
          if (r.isBlocked) continue;

          const { h: sh, m: sm } = hhmmToParts(r.startTimeLocal);
          const { h: eh, m: em } = hhmmToParts(r.endTimeLocal);

          const start = fromZonedTime(`${dayKey}T${pad2(sh)}:${pad2(sm)}:00`, tz);
          const end = fromZonedTime(`${dayKey}T${pad2(eh)}:${pad2(em)}:00`, tz);

          // Clip to query range.
          const clippedStart = start < startUtc ? startUtc : start;
          const clippedEnd = end > endUtc ? endUtc : end;
          if (clippedStart >= clippedEnd) continue;

          events.push({
            id: `${r.id}:${dayKey}`,
            kind: 'AVAILABILITY',
            title: 'Available',
            startUtc: clippedStart.toISOString(),
            endUtc: clippedEnd.toISOString(),
            locationId,
            staffId: r.staffId ?? null,
            locationName: loc.name,
            locationTimeZone: tz,
            staffLabel: r.staffId
              ? (availStaffNameById.get(r.staffId) ?? r.staffId)
              : 'All staff',
          });
        }
      }
    }

    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

