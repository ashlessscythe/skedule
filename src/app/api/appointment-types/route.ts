import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const CreateAppointmentTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  durationMinutes: z
    .number()
    .int()
    .min(15)
    .refine((v) => v % 15 === 0, 'Duration must be in 15-minute increments'),
  color: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getTenantContext();
  const types = await prisma.appointmentType.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const json = await req.json();
  const input = CreateAppointmentTypeSchema.parse(json);

  const created = await prisma.appointmentType.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      color: input.color ?? null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

