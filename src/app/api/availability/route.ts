import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const CreateAvailabilitySchema = z.object({
  locationId: z.string().min(1),
  staffId: z.string().min(1).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTimeLocal: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  specificDate: z.string().datetime().optional().nullable(),
  isBlocked: z.boolean().optional(),
});

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');
  const staffId = searchParams.get('staffId');

  const rows = await prisma.availability.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(locationId ? { locationId } : {}),
      ...(staffId ? { staffId } : {}),
    },
    orderBy: [{ locationId: 'asc' }, { dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const json = await req.json();
  const input = CreateAvailabilitySchema.parse(json);

  const created = await prisma.availability.create({
    data: {
      tenantId: ctx.tenantId,
      locationId: input.locationId,
      staffId: input.staffId ?? null,
      dayOfWeek: input.dayOfWeek ?? null,
      startTimeLocal: input.startTimeLocal ?? null,
      endTimeLocal: input.endTimeLocal ?? null,
      specificDate: input.specificDate ? new Date(input.specificDate) : null,
      isBlocked: input.isBlocked ?? false,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

