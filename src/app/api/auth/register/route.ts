import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  notifyTenantAdminsOfPendingRegistration,
  sendRegistrationPendingEmailToUser,
} from '@/lib/email/registration-emails';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const input = RegisterSchema.parse({
    ...json,
    email: typeof json?.email === 'string' ? json.email.toLowerCase().trim() : json?.email,
  });

  const tenantSlug = process.env.DEFAULT_TENANT_SLUG?.trim();
  if (!tenantSlug) {
    return NextResponse.json(
      { error: 'Missing DEFAULT_TENANT_SLUG configuration.' },
      { status: 500 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Configured tenant not found.' }, { status: 500 });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        isActive: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const membership = await tx.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'STAFF',
        status: 'PENDING',
      },
      select: { id: true, status: true, role: true },
    });

    return { user, membership };
  });

  const userName = `${created.user.firstName} ${created.user.lastName}`.trim();
  try {
    await sendRegistrationPendingEmailToUser({
      tenantId: tenant.id,
      tenantName: tenant.name,
      userEmail: created.user.email,
      userName,
    });
    await notifyTenantAdminsOfPendingRegistration({
      tenantId: tenant.id,
      tenantName: tenant.name,
      userEmail: created.user.email,
      userName,
    });
  } catch (e) {
    console.error('[register] email failed', e);
  }

  return NextResponse.json(
    {
      userId: created.user.id,
      tenantId: tenant.id,
      membershipId: created.membership.id,
      status: created.membership.status,
    },
    { status: 201 }
  );
}

