import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getTenantContext, requireAdmin } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';
import { sendRegistrationApprovedEmailToUser } from '@/lib/email/registration-emails';
import { sendAdminEmailChangedNotice } from '@/lib/email/account-emails';
import {
  bumpSessionVersion,
  EMAIL_ALREADY_REGISTERED,
  invalidatePasswordResetTokens,
  normalizeEmail,
} from '@/lib/account/email-change';
import { getLastAdminGuardError } from '@/lib/staff/last-admin-guard';

const UpdateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'REJECTED']).optional(),
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenantContext();
  requireAdmin(ctx);
  const { id } = await params;

  const json = await req.json();
  const input = UpdateMemberSchema.parse({
    ...json,
    email:
      typeof json?.email === 'string' ? normalizeEmail(json.email) : json?.email,
  });

  const hasMembershipChange = Boolean(input.role || input.status);
  const hasUserChange = Boolean(
    input.email || input.firstName || input.lastName || input.isActive !== undefined
  );

  if (!hasMembershipChange && !hasUserChange) {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 });
  }

  const existing = await prisma.userTenant.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      role: true,
      status: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const lastAdminError = await getLastAdminGuardError({
    tenantId: ctx.tenantId,
    membership: { id: existing.id, role: existing.role, status: existing.status },
    userIsActive: existing.user.isActive,
    changes: {
      role: input.role,
      status: input.status,
      isActive: input.isActive,
    },
  });
  if (lastAdminError) {
    return NextResponse.json({ error: lastAdminError }, { status: 400 });
  }

  const normalizedNewEmail = input.email ? normalizeEmail(input.email) : null;
  if (normalizedNewEmail && normalizedNewEmail !== existing.user.email) {
    const taken = await prisma.user.findUnique({
      where: { email: normalizedNewEmail },
      select: { id: true },
    });
    if (taken && taken.id !== existing.userId) {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 });
    }
  }

  const emailChanged =
    Boolean(normalizedNewEmail) && normalizedNewEmail !== existing.user.email;
  const isActiveChanged =
    input.isActive !== undefined && input.isActive !== existing.user.isActive;

  let updatedUser = existing.user;

  try {
    await prisma.$transaction(async (tx) => {
      if (hasUserChange) {
        updatedUser = await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(normalizedNewEmail ? { email: normalizedNewEmail } : {}),
            ...(input.firstName ? { firstName: input.firstName } : {}),
            ...(input.lastName ? { lastName: input.lastName } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        });
      }
      console.log('updatedUser', updatedUser);

      if (emailChanged || isActiveChanged) {
        await invalidatePasswordResetTokens(existing.userId, tx);
        await bumpSessionVersion(existing.userId, tx);
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 });
    }
    throw e;
  }

  const updated = await prisma.userTenant.update({
    where: { id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
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
    entityId: updated.id,
    metadata: {
      userId: updated.userId,
      membership: {
        from: { role: existing.role, status: existing.status },
        to: { role: updated.role, status: updated.status },
      },
      user: {
        from: {
          email: existing.user.email,
          firstName: existing.user.firstName,
          lastName: existing.user.lastName,
          isActive: existing.user.isActive,
        },
        to: {
          email: updated.user.email,
          firstName: updated.user.firstName,
          lastName: updated.user.lastName,
          isActive: updated.user.isActive,
        },
      },
      source: 'admin_staff_edit',
    },
  });

  if (emailChanged && normalizedNewEmail) {
    try {
      const userName = `${updated.user.firstName} ${updated.user.lastName}`.trim();
      await sendAdminEmailChangedNotice({
        toEmail: normalizedNewEmail,
        userName: userName || normalizedNewEmail,
        newEmail: normalizedNewEmail,
      });
    } catch (e) {
      console.error('[admin/staff] email change notice failed', updated.id, e);
    }
  }

  if (existing.status !== 'ACTIVE' && updated.status === 'ACTIVE') {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { name: true },
      });
      const email = updated.user.email?.trim();
      const userName = `${updated.user.firstName} ${updated.user.lastName}`.trim();
      if (tenant?.name && email) {
        await sendRegistrationApprovedEmailToUser({
          tenantId: ctx.tenantId,
          tenantName: tenant.name,
          userEmail: email,
          userName,
        });
      }
    } catch (e) {
      console.error('[admin/staff] approval email failed', updated.id, e);
    }
  }

  return NextResponse.json({
    id: updated.id,
    tenantId: updated.tenantId,
    userId: updated.userId,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt,
    user: updated.user,
  });
}
