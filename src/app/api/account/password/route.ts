import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';
import {
  bumpSessionVersion,
  invalidatePasswordResetTokens,
} from '@/lib/account/email-change';

const PasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();

  const json = await req.json().catch(() => null);
  const parsed = PasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const passwordOk = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
  }

  const samePassword = await bcrypt.compare(parsed.data.newPassword, user.passwordHash);
  if (samePassword) {
    return NextResponse.json(
      { error: 'Choose a password that is different from your current password.' },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await invalidatePasswordResetTokens(user.id, tx);
    await bumpSessionVersion(user.id, tx);
  });

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      field: 'password',
      source: 'self_serve_password_change',
    },
  });

  return NextResponse.json({
    ok: true,
    signOutRequired: true,
    message:
      'Your password was updated. You have been signed out on all devices — sign in again with your new password.',
  });
}
