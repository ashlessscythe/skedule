import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CheckinCard } from './ui';

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    include: {
      appointment: {
        include: {
          location: { select: { name: true, timeZone: true } },
          client: { select: { firstName: true, lastName: true, email: true } },
          staff: { select: { firstName: true, lastName: true } },
          type: { select: { name: true, durationMinutes: true } },
        },
      },
    },
  });

  if (!qr) notFound();
  if (qr.usedAt) notFound();
  if (qr.expiresAt.getTime() < new Date().getTime()) notFound();
  if (qr.appointment.deletedAt) notFound();
  if (qr.appointment.status === 'CANCELLED') notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <CheckinCard token={token} appointment={qr.appointment} />
    </div>
  );
}

