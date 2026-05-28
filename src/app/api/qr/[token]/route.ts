import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { getCheckinWindowState } from '@/lib/checkin/checkin-window';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: {
      appointment: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
          tenantId: true,
          clientId: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!qr) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (qr.usedAt) return NextResponse.json({ error: 'Already checked in' }, { status: 400 });
  if (qr.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: 'Expired' }, { status: 400 });
  if (qr.appointment.deletedAt)
    return NextResponse.json({ error: 'Invalid appointment' }, { status: 400 });
  if (qr.appointment.status === 'CANCELLED')
    return NextResponse.json({ error: 'Cancelled' }, { status: 400 });
  if (qr.appointment.status === 'NO_SHOW')
    return NextResponse.json({ error: 'Appointment not available' }, { status: 400 });
  if (qr.appointment.status === 'COMPLETED')
    return NextResponse.json({ error: 'Appointment already completed' }, { status: 400 });
  if (qr.appointment.status === 'CHECKED_IN')
    return NextResponse.json({ error: 'Already checked in' }, { status: 400 });
  if (qr.appointment.status !== 'SCHEDULED')
    return NextResponse.json({ error: 'Check-in not available' }, { status: 400 });

  const windowState = getCheckinWindowState({
    startTime: qr.appointment.startTime,
    endTime: qr.appointment.endTime,
  });
  if (windowState === 'too_early') {
    return NextResponse.json(
      { error: 'Too early to check in. Check-in opens 24 hours before your appointment.' },
      { status: 400 }
    );
  }
  if (windowState === 'closed') {
    return NextResponse.json(
      { error: 'Check-in is no longer available for this appointment.' },
      { status: 400 }
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.qrToken.update({
      where: { id: qr.id },
      data: { usedAt: now },
    });
    await tx.appointment.update({
      where: { id: qr.appointment.id },
      data: { status: 'CHECKED_IN' },
    });
  });

  await writeAuditLog({
    tenantId: qr.appointment.tenantId,
    userId: null,
    action: 'APPOINTMENT_STATUS_CHANGED',
    entityType: 'Appointment',
    entityId: qr.appointment.id,
    appointmentId: qr.appointment.id,
    clientId: qr.appointment.clientId,
    metadata: { via: 'qr_checkin', from: 'SCHEDULED', to: 'CHECKED_IN' },
  });

  return NextResponse.json({ ok: true });
}
