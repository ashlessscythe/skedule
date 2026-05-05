import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { generateOpaqueToken } from '@/lib/security/tokens';

const CreateIntakeTokenSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  const json = await req.json();
  const input = CreateIntakeTokenSchema.parse(json);

  if (!input.appointmentId && !input.clientId) {
    return NextResponse.json(
      { error: 'Either appointmentId or clientId is required' },
      { status: 400 }
    );
  }

  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 72) * 60 * 60 * 1000
  );
  const token = generateOpaqueToken(32);

  const created = await prisma.intakeToken.create({
    data: {
      tenantId: ctx.tenantId,
      appointmentId: input.appointmentId ?? null,
      clientId: input.clientId ?? null,
      token,
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      token: created.token,
      expiresAt: created.expiresAt,
      url: `/intake/${created.token}`,
    },
    { status: 201 }
  );
}

