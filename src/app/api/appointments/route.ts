import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { assertWithinAvailability } from '@/lib/scheduling/availability';
import { assertNoConflict } from '@/lib/scheduling/conflicts';
import { toRRuleString } from '@/lib/scheduling/recurrence';
import { writeAuditLog } from '@/lib/audit';

const CreateAppointmentSchema = z.object({
  locationId: z.string().min(1),
  clientId: z.string().min(1),
  staffId: z.string().min(1).optional().nullable(),
  typeId: z.string().min(1).optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional().nullable(),
  recurrenceRule: z
    .object({
      frequency: z.string().min(1),
      interval: z.number().int().min(1).optional(),
      byWeekDay: z.array(z.string()).optional(),
      byMonthDay: z.array(z.number().int()).optional(),
      count: z.number().int().min(1).optional().nullable(),
      until: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

export async function GET() {
  const ctx = await getTenantContext();
  const appts = await prisma.appointment.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { startTime: 'asc' },
    take: 200,
  });
  return NextResponse.json(appts);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  const json = await req.json();
  const input = CreateAppointmentSchema.parse(json);

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (!(start instanceof Date) || isNaN(start.getTime())) throw new Error('Invalid startTime');
  if (!(end instanceof Date) || isNaN(end.getTime())) throw new Error('Invalid endTime');
  if (start >= end) throw new Error('Invalid time range');

  await assertWithinAvailability({
    tenantId: ctx.tenantId,
    locationId: input.locationId,
    staffId: input.staffId ?? null,
    startTimeUtc: start,
    endTimeUtc: end,
  });
  await assertNoConflict({
    tenantId: ctx.tenantId,
    staffId: input.staffId ?? null,
    locationId: input.locationId,
    startTimeUtc: start,
    endTimeUtc: end,
  });

  const recurrenceRuleId = input.recurrenceRule
    ? (
        await prisma.recurrenceRule.create({
          data: {
            tenantId: ctx.tenantId,
            frequency: input.recurrenceRule.frequency,
            interval: input.recurrenceRule.interval ?? 1,
            byWeekDay: input.recurrenceRule.byWeekDay
              ? input.recurrenceRule.byWeekDay.join(',')
              : null,
            byMonthDay: input.recurrenceRule.byMonthDay
              ? input.recurrenceRule.byMonthDay.join(',')
              : null,
            count: input.recurrenceRule.count ?? null,
            until: input.recurrenceRule.until ? new Date(input.recurrenceRule.until) : null,
          },
          select: { id: true },
        })
      ).id
    : null;

  const created = await prisma.appointment.create({
    data: {
      tenantId: ctx.tenantId,
      locationId: input.locationId,
      clientId: input.clientId,
      staffId: input.staffId ?? null,
      typeId: input.typeId ?? null,
      startTime: start,
      endTime: end,
      notes: input.notes ?? null,
      recurrenceRuleId,
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'APPOINTMENT_CREATED',
    entityType: 'Appointment',
    entityId: created.id,
    appointmentId: created.id,
    clientId: created.clientId,
    metadata: {
      locationId: created.locationId,
      staffId: created.staffId,
      startTime: created.startTime,
      endTime: created.endTime,
      recurrenceRuleId,
    },
  });

  const rrule = input.recurrenceRule
    ? toRRuleString({
        frequency: input.recurrenceRule.frequency,
        interval: input.recurrenceRule.interval,
        byWeekDay: input.recurrenceRule.byWeekDay?.join(',') ?? null,
        byMonthDay: input.recurrenceRule.byMonthDay?.join(',') ?? null,
        count: input.recurrenceRule.count ?? null,
        until: input.recurrenceRule.until ? new Date(input.recurrenceRule.until) : null,
      })
    : null;

  return NextResponse.json({ ...created, rrule }, { status: 201 });
}

