import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { writeAuditLog } from '@/lib/audit';
import {
  bumpSessionVersion,
  EMAIL_ALREADY_REGISTERED,
  EMAIL_CHANGE_MAX_VERIFY_ATTEMPTS,
  hashEmailChangeCode,
  invalidatePasswordResetTokens,
  normalizeEmail,
} from '@/lib/account/email-change';

const ConfirmSchema = z.object({
  newEmail: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();

  const json = await req.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse({
    ...json,
    newEmail:
      typeof json?.newEmail === 'string' ? normalizeEmail(json.newEmail) : json?.newEmail,
    code: typeof json?.code === 'string' ? json.code.trim() : json?.code,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, email: true, isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (parsed.data.newEmail === user.email) {
    return NextResponse.json({ error: 'That is already your email address.' }, { status: 400 });
  }

  const verification = await prisma.emailChangeVerification.findFirst({
    where: {
      userId: user.id,
      newEmail: parsed.data.newEmail,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    return NextResponse.json(
      { error: 'Verification code expired or not found. Request a new code.' },
      { status: 400 }
    );
  }

  if (verification.attemptCount >= EMAIL_CHANGE_MAX_VERIFY_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Request a new code.' },
      { status: 429 }
    );
  }

  const codeHash = hashEmailChangeCode(parsed.data.code);
  if (codeHash !== verification.codeHash) {
    await prisma.emailChangeVerification.update({
      where: { id: verification.id },
      data: { attemptCount: { increment: 1 } },
    });
    return NextResponse.json({ error: 'Incorrect verification code.' }, { status: 403 });
  }

  const taken = await prisma.user.findUnique({
    where: { email: parsed.data.newEmail },
    select: { id: true },
  });
  if (taken && taken.id !== user.id) {
    return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { email: parsed.data.newEmail },
      });
      await tx.emailChangeVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });
      await tx.emailChangeVerification.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await invalidatePasswordResetTokens(user.id, tx);
      await bumpSessionVersion(user.id, tx);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 });
    }
    throw e;
  }

  await writeAuditLog({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      field: 'email',
      from: user.email,
      to: parsed.data.newEmail,
      source: 'self_serve_email_change',
    },
  });

  return NextResponse.json({
    ok: true,
    signOutRequired: true,
    message:
      'Your email was updated. You have been signed out on all devices — sign in again with your new email.',
  });
}
