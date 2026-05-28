import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { generateOpaqueToken } from '@/lib/security/tokens';
import { appUrl } from '@/lib/app-url';

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

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (input.expiresInHours ?? 72) * 60 * 60 * 1000
  );
  const token = generateOpaqueToken(32);

  const created = await prisma.$transaction(async (tx) => {
    if (input.clientId) {
      await tx.intakeToken.updateMany({
        where: {
          tenantId: ctx.tenantId,
          clientId: input.clientId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { expiresAt: now },
      });
    } else if (input.appointmentId) {
      await tx.intakeToken.updateMany({
        where: {
          tenantId: ctx.tenantId,
          appointmentId: input.appointmentId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { expiresAt: now },
      });
    }

    return tx.intakeToken.create({
      data: {
        tenantId: ctx.tenantId,
        appointmentId: input.appointmentId ?? null,
        clientId: input.clientId ?? null,
        token,
        expiresAt,
      },
    });
  });

  const url = appUrl(`/intake/${created.token}`);

  return NextResponse.json(
    {
      token: created.token,
      expiresAt: created.expiresAt,
      url,
    },
    { status: 201 }
  );
}

