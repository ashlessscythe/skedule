import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { expandAvailabilitySegments } from '@/lib/scheduling/expand-availability-segments';

const QuerySchema = z.object({
  locationId: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  staffId: z.string().min(1).optional(),
});

function formatUserDisplayName(u: { firstName: string; lastName: string; email: string }) {
  const n = `${u.firstName} ${u.lastName}`.trim();
  return n || u.email;
}

export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();
    requireAdmin(ctx);

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

    const location = await prisma.location.findFirst({
      where: { id: q.locationId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, name: true, timeZone: true },
    });
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const availRows = await prisma.availability.findMany({
      where: {
        tenantId: ctx.tenantId,
        locationId: q.locationId,
      },
      orderBy: [{ specificDate: 'asc' }, { dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
      take: 2000,
    });

    const staffIds = [
      ...new Set(availRows.map((r) => r.staffId).filter((id): id is string => Boolean(id))),
    ];
    const staffUsers =
      staffIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: staffIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [];
    const staffNameById = new Map(staffUsers.map((u) => [u.id, formatUserDisplayName(u)]));

    const daySpanMs = endUtc.getTime() - startUtc.getTime();
    const maxDays = Math.min(14, Math.max(1, Math.ceil(daySpanMs / (24 * 60 * 60 * 1000))));

    const segments = expandAvailabilitySegments({
      rows: availRows,
      timeZone: location.timeZone,
      startUtc,
      endUtc,
      staffNameById,
      staffIdFilter: q.staffId ?? null,
      maxDays,
    });

    return NextResponse.json({
      location: { id: location.id, name: location.name, timeZone: location.timeZone },
      segments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Forbidden' ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
