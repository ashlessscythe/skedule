import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { assertWithinAvailability } from '@/lib/scheduling/availability';
import { assertNoConflict } from '@/lib/scheduling/conflicts';
import { writeAuditLog } from '@/lib/audit';

const UpdateAppointmentSchema = z.object({
  locationId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  staffId: z.string().min(1).optional().nullable(),
  typeId: z.string().min(1).optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  const { id } = await params;

  const json = await req.json();
  const input = UpdateAppointmentSchema.parse(json);

  const existing = await prisma.appointment.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, locationId: true, staffId: true, clientId: true, startTime: true, endTime: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const start = input.startTime ? new Date(input.startTime) : existing.startTime;
  const end = input.endTime ? new Date(input.endTime) : existing.endTime;
  if (start >= end) return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });

  const locationId = input.locationId ?? existing.locationId;
  const staffId = input.staffId === undefined ? existing.staffId : input.staffId;

  await assertWithinAvailability({
    tenantId: ctx.tenantId,
    locationId,
    staffId: staffId ?? null,
    startTimeUtc: start,
    endTimeUtc: end,
  });
  await assertNoConflict({
    tenantId: ctx.tenantId,
    staffId: staffId ?? null,
    locationId,
    startTimeUtc: start,
    endTimeUtc: end,
    excludeAppointmentId: id,
  });

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.staffId !== undefined ? { staffId: input.staffId } : {}),
      ...(input.typeId !== undefined ? { typeId: input.typeId } : {}),
      ...(input.startTime ? { startTime: start } : {}),
      ...(input.endTime ? { endTime: end } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'APPOINTMENT_UPDATED',
    entityType: 'Appointment',
    entityId: updated.id,
    appointmentId: updated.id,
    clientId: updated.clientId,
    metadata: { fields: Object.keys(input) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  const { id } = await params;

  const existing = await prisma.appointment.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, clientId: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', deletedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'APPOINTMENT_CANCELLED',
    entityType: 'Appointment',
    entityId: updated.id,
    appointmentId: updated.id,
    clientId: existing.clientId,
    metadata: { cancelled: true },
  });

  return NextResponse.json({ ok: true });
}

