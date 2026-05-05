import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  timeZone: z.string().min(1),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await getTenantContext();
  const locations = await prisma.location.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(locations);
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const json = await req.json();
  const input = CreateLocationSchema.parse(json);

  const created = await prisma.location.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      timeZone: input.timeZone,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      country: input.country ?? null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

