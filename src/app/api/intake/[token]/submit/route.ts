import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const IntakeSubmitSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const json = await req.json();
  const input = IntakeSubmitSchema.parse(json);

  const intake = await prisma.intakeToken.findUnique({
    where: { token },
    include: {
      appointment: { select: { id: true, clientId: true, tenantId: true } },
      client: { select: { id: true, tenantId: true } },
    },
  });
  if (!intake) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (intake.usedAt) return NextResponse.json({ error: 'Token already used' }, { status: 400 });
  if (intake.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });

  const clientId = intake.clientId ?? intake.appointment?.clientId ?? null;
  if (!clientId) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
      },
    });

    await tx.intakeToken.update({
      where: { id: intake.id },
      data: { usedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}

