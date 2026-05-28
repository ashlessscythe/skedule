import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import {
  buildCheckinUrls,
  ensureAppointmentQrToken,
} from '@/lib/checkin/qr-token';

const CreateQrTokenSchema = z.object({
  appointmentId: z.string().min(1),
  rotate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  const json = await req.json();
  const input = CreateQrTokenSchema.parse(json);

  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, endTime: true, status: true },
  });
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (['CANCELLED', 'NO_SHOW', 'COMPLETED', 'CHECKED_IN'].includes(appointment.status)) {
    return NextResponse.json({ error: 'Check-in not available for this appointment' }, { status: 400 });
  }
  if (appointment.endTime.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Appointment has ended' }, { status: 400 });
  }

  const created = await ensureAppointmentQrToken({
    tenantId: ctx.tenantId,
    appointmentId: appointment.id,
    expiresAt: appointment.endTime,
    rotate: input.rotate ?? false,
  });

  const urls = buildCheckinUrls(created.token);

  return NextResponse.json(
    {
      token: created.token,
      expiresAt: created.expiresAt,
      url: urls.checkinUrl,
      pdfUrl: urls.pdfUrl,
      qrImageUrl: urls.qrImageUrl,
    },
    { status: 201 }
  );
}
