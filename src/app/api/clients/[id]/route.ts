import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';

const UpdateClientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  const { id } = await params;

  const json = await req.json();
  const input = UpdateClientSchema.parse(json);

  const existing = await prisma.client.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'CLIENT_UPDATED',
    entityType: 'Client',
    entityId: updated.id,
    clientId: updated.id,
    metadata: { fields: Object.keys(input) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  const { id } = await params;

  const existing = await prisma.client.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'CLIENT_UPDATED',
    entityType: 'Client',
    entityId: id,
    clientId: id,
    metadata: { deleted: true },
  });

  return NextResponse.json({ ok: true });
}

