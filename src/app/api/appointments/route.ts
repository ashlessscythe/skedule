import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { assertWithinAvailability } from '@/lib/scheduling/availability';
import { assertNoConflict } from '@/lib/scheduling/conflicts';
import {
  expandRecurrenceExtraStartTimes,
  MAX_RECURRENCE_SERIES_INSTANCES,
  toRRuleString,
} from '@/lib/scheduling/recurrence';
import { writeAuditLog } from '@/lib/audit';
import { sendAppointmentBookedEmail } from '@/lib/email/appointment-emails';

const RecurrencePayloadSchema = z
  .object({
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    interval: z.number().int().min(1).max(12).optional(),
    byWeekDay: z.array(z.string()).optional(),
    byMonthDay: z.array(z.number().int()).optional(),
    count: z.number().int().min(2).max(MAX_RECURRENCE_SERIES_INSTANCES).optional().nullable(),
    until: z.string().datetime().optional().nullable(),
  })
  .superRefine((r, ctx) => {
    const hasC = r.count != null;
    const hasU = r.until != null && r.until.length > 0;
    if (hasC === hasU) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence requires exactly one of count or until',
        path: [],
      });
    }
  });

const CreateAppointmentSchema = z.object({
  locationId: z.string().min(1),
  clientId: z.string().min(1),
  staffId: z.string().min(1).optional().nullable(),
  typeId: z.string().min(1).optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).optional(),
  notes: z.string().optional().nullable(),
  recurrenceRule: RecurrencePayloadSchema.optional(),
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
  try {
    const ctx = await getTenantContext();
    const json = await req.json();
    const input = CreateAppointmentSchema.parse(json);

    const start = new Date(input.startTime);
    const end = input.durationMinutes
      ? new Date(start.getTime() + input.durationMinutes * 60 * 1000)
      : input.endTime
        ? new Date(input.endTime)
        : null;
    if (!(start instanceof Date) || isNaN(start.getTime()))
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
    if (!end || !(end instanceof Date) || isNaN(end.getTime()))
      return NextResponse.json(
        { error: 'Provide either durationMinutes or endTime' },
        { status: 400 }
      );
    if (input.durationMinutes && input.durationMinutes % 15 !== 0) {
      return NextResponse.json(
        { error: 'Duration must be in 15-minute increments' },
        { status: 400 }
      );
    }
    if (start >= end)
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });

    const durationMs = end.getTime() - start.getTime();
    const slots: { start: Date; end: Date }[] = [{ start, end }];

    const recurrenceForExpand = input.recurrenceRule
      ? {
          frequency: input.recurrenceRule.frequency,
          interval: input.recurrenceRule.interval ?? 1,
          byWeekDay: input.recurrenceRule.byWeekDay?.join(',') ?? null,
          byMonthDay: input.recurrenceRule.byMonthDay?.join(',') ?? null,
          count: input.recurrenceRule.count ?? null,
          until: input.recurrenceRule.until ? new Date(input.recurrenceRule.until) : null,
        }
      : null;

    if (recurrenceForExpand) {
      const extraStarts = expandRecurrenceExtraStartTimes({
        recurrence: recurrenceForExpand,
        dtStartUtc: start,
      });
      for (const st of extraStarts) {
        slots.push({ start: st, end: new Date(st.getTime() + durationMs) });
      }
    }

    if (input.staffId) {
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i]!;
          const b = slots[j]!;
          if (a.start < b.end && b.start < a.end) {
            throw new Error('Recurrence would double-book this staff member.');
          }
        }
      }
    }

    for (const slot of slots) {
      await assertWithinAvailability({
        tenantId: ctx.tenantId,
        locationId: input.locationId,
        staffId: input.staffId ?? null,
        startTimeUtc: slot.start,
        endTimeUtc: slot.end,
      });
      await assertNoConflict({
        tenantId: ctx.tenantId,
        staffId: input.staffId ?? null,
        locationId: input.locationId,
        startTimeUtc: slot.start,
        endTimeUtc: slot.end,
      });
    }

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
              until: input.recurrenceRule.until
                ? new Date(input.recurrenceRule.until)
                : null,
            },
            select: { id: true },
          })
        ).id
      : null;

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

    const seriesAppointmentIds: string[] = [];
    let createdFirst: Awaited<ReturnType<typeof prisma.appointment.create>> | null = null;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!;
      const appt = await prisma.appointment.create({
        data: {
          tenantId: ctx.tenantId,
          locationId: input.locationId,
          clientId: input.clientId,
          staffId: input.staffId ?? null,
          typeId: input.typeId ?? null,
          startTime: slot.start,
          endTime: slot.end,
          notes: input.notes ?? null,
          recurrenceRuleId,
        },
      });
      seriesAppointmentIds.push(appt.id);
      if (i === 0) createdFirst = appt;

      await writeAuditLog({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'APPOINTMENT_CREATED',
        entityType: 'Appointment',
        entityId: appt.id,
        appointmentId: appt.id,
        clientId: appt.clientId,
        metadata: {
          locationId: appt.locationId,
          staffId: appt.staffId,
          startTime: appt.startTime,
          endTime: appt.endTime,
          recurrenceRuleId,
          seriesFirst: i === 0,
          ...(i > 0 && seriesAppointmentIds[0]
            ? { seriesFirstId: seriesAppointmentIds[0] }
            : {}),
        },
      });
    }

    const seriesExtra = Math.max(0, seriesAppointmentIds.length - 1);
    void sendAppointmentBookedEmail({
      appointmentId: createdFirst!.id,
      ...(seriesExtra > 0 ? { seriesExtraCount: seriesExtra } : {}),
    });

    return NextResponse.json(
      {
        ...createdFirst!,
        rrule,
        seriesCount: seriesAppointmentIds.length,
        seriesAppointmentIds,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.issues[0]?.message ?? 'Invalid request';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unable to create appointment';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

