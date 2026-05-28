import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const UpdateAppointmentTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  durationMinutes: z
    .number()
    .int()
    .min(15)
    .refine((v) => v % 15 === 0, 'Duration must be in 15-minute increments')
    .optional(),
  color: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const { id } = await params;

  const json = await req.json();
  const input = UpdateAppointmentTypeSchema.parse(json);

  const existing = await prisma.appointmentType.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.appointmentType.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.color !== undefined ? { color: input.color ?? null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const { id } = await params;

  const existing = await prisma.appointmentType.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.appointmentType.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

