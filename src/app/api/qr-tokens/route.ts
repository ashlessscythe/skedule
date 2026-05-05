import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { generateOpaqueToken } from '@/lib/security/tokens';

const CreateQrTokenSchema = z.object({
  appointmentId: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  const json = await req.json();
  const input = CreateQrTokenSchema.parse(json);

  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 24 * 7) * 60 * 60 * 1000
  );
  const token = generateOpaqueToken(32);

  const created = await prisma.qrToken.create({
    data: {
      tenantId: ctx.tenantId,
      appointmentId: appointment.id,
      token,
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      token: created.token,
      expiresAt: created.expiresAt,
      url: `/checkin/${created.token}`,
    },
    { status: 201 }
  );
}

