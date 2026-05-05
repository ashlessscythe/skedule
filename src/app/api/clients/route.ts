import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';

const CreateClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getTenantContext();
  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  const json = await req.json();
  const input = CreateClientSchema.parse(json);

  const created = await prisma.client.create({
    data: {
      tenantId: ctx.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'CLIENT_CREATED',
    entityType: 'Client',
    entityId: created.id,
    clientId: created.id,
    metadata: { email: created.email ? '[set]' : null, phone: created.phone ? '[set]' : null },
  });

  return NextResponse.json(created, { status: 201 });
}

