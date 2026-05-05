import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { qrPngDataUrl } from '@/lib/qr/generate';
import { generateAppointmentCardPdf } from '@/lib/pdf/appointment-card';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: {
      appointment: {
        include: {
          tenant: { select: { name: true } },
          client: { select: { firstName: true, lastName: true } },
          location: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
          type: { select: { name: true } },
        },
      },
    },
  });

  if (!qr) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (qr.expiresAt.getTime() < new Date().getTime())
    return NextResponse.json({ error: 'Expired' }, { status: 400 });
  if (qr.appointment.deletedAt)
    return NextResponse.json({ error: 'Invalid appointment' }, { status: 400 });

  const checkinUrl = `${process.env.NEXTAUTH_URL ?? ''}/checkin/${qr.token}`;
  const dataUrl = await qrPngDataUrl(checkinUrl);
  const b64 = dataUrl.split(',')[1] ?? '';
  const pngBytes = Uint8Array.from(Buffer.from(b64, 'base64'));

  const pdfBytes = await generateAppointmentCardPdf({
    tenantName: qr.appointment.tenant.name,
    clientName: `${qr.appointment.client.firstName} ${qr.appointment.client.lastName}`,
    serviceName: qr.appointment.type?.name ?? null,
    staffName: qr.appointment.staff
      ? `${qr.appointment.staff.firstName} ${qr.appointment.staff.lastName}`
      : null,
    whenText: qr.appointment.startTime.toISOString(),
    whereText: qr.appointment.location.name,
    qrPngBytes: pngBytes,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="appointment-card.pdf"',
      'cache-control': 'no-store',
    },
  });
}

