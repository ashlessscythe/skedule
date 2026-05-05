import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: { appointment: { select: { id: true, status: true, deletedAt: true } } },
  });

  if (!qr) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (qr.usedAt) return NextResponse.json({ error: 'Already used' }, { status: 400 });
  if (qr.expiresAt.getTime() < new Date().getTime())
    return NextResponse.json({ error: 'Expired' }, { status: 400 });
  if (qr.appointment.deletedAt) return NextResponse.json({ error: 'Invalid appointment' }, { status: 400 });
  if (qr.appointment.status === 'CANCELLED')
    return NextResponse.json({ error: 'Cancelled' }, { status: 400 });

  await prisma.qrToken.update({
    where: { id: qr.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

