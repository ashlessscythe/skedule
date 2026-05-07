import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';

const CreateMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  status: z.enum(['ACTIVE', 'PENDING', 'REJECTED']).default('ACTIVE'),
});

export async function GET() {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const members = await prisma.userTenant.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      userId: m.userId,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt,
      user: m.user,
    }))
  );
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);

  const json = await req.json();
  const input = CreateMemberSchema.parse({
    ...json,
    email: typeof json?.email === 'string' ? json.email.toLowerCase().trim() : json?.email,
  });

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  let userId = existingUser?.id;
  if (!userId) {
    if (!input.firstName || !input.lastName || !input.password) {
      return NextResponse.json(
        { error: 'firstName, lastName, and password are required for new users.' },
        { status: 400 }
      );
    }

    const createdUser = await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: await bcrypt.hash(input.password, 10),
        isActive: true,
      },
      select: { id: true },
    });
    userId = createdUser.id;

    await writeAuditLog({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: userId!,
      metadata: { email: input.email },
    });
  }

  const existingMembership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: userId!, tenantId: ctx.tenantId } },
    select: { id: true },
  });
  if (existingMembership) {
    return NextResponse.json({ error: 'User is already a member of this tenant.' }, { status: 409 });
  }

  const membership = await prisma.userTenant.create({
    data: {
      userId: userId!,
      tenantId: ctx.tenantId,
      role: input.role,
      status: input.status,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'USER_UPDATED',
    entityType: 'UserTenant',
    entityId: membership.id,
    metadata: { userId: userId!, role: membership.role, status: membership.status },
  });

  return NextResponse.json(
    {
      id: membership.id,
      tenantId: membership.tenantId,
      userId: membership.userId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
      user: membership.user,
    },
    { status: 201 }
  );
}

