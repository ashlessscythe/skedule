import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  timeZone: z.string().min(1).optional(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const { id } = await params;

  const json = await req.json();
  const input = UpdateLocationSchema.parse(json);

  const existing = await prisma.location.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.location.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.timeZone ? { timeZone: input.timeZone } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 ?? null } : {}),
      ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 ?? null } : {}),
      ...(input.city !== undefined ? { city: input.city ?? null } : {}),
      ...(input.state !== undefined ? { state: input.state ?? null } : {}),
      ...(input.postalCode !== undefined ? { postalCode: input.postalCode ?? null } : {}),
      ...(input.country !== undefined ? { country: input.country ?? null } : {}),
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

  const existing = await prisma.location.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.location.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

