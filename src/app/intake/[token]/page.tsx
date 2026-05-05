import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { IntakeForm } from './ui';

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const intake = await prisma.intakeToken.findUnique({
    where: { token },
    include: {
      appointment: {
        include: {
          location: { select: { name: true, timeZone: true } },
          client: { select: { firstName: true, lastName: true, email: true, phone: true } },
        },
      },
      client: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!intake) notFound();
  if (intake.usedAt) notFound();
  if (intake.expiresAt.getTime() < new Date().getTime()) notFound();

  const client = intake.client ?? intake.appointment?.client;
  if (!client) notFound();

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Client intake</h1>
        <p className="text-sm text-muted-foreground">
          Please confirm your details for your appointment.
        </p>
      </div>
      <div className="mt-6">
        <IntakeForm
          token={token}
          initial={{
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email ?? '',
            phone: client.phone ?? '',
          }}
        />
      </div>
    </div>
  );
}

