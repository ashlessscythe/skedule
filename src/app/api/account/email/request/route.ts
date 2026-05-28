import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant-context';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { sendEmailChangeVerificationCode } from '@/lib/email/account-emails';
import {
  EMAIL_ALREADY_REGISTERED,
  EMAIL_CHANGE_CODE_EXPIRY_MINUTES,
  EMAIL_CHANGE_MAX_REQUESTS_PER_WINDOW,
  EMAIL_CHANGE_REQUEST_WINDOW_MS,
  generateEmailChangeCode,
  hashEmailChangeCode,
  normalizeEmail,
} from '@/lib/account/email-change';

const RequestSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();

  const json = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse({
    ...json,
    newEmail:
      typeof json?.newEmail === 'string' ? normalizeEmail(json.newEmail) : json?.newEmail,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const turnstile = await verifyTurnstile({
    token: parsed.data.turnstileToken,
    headers: req.headers,
  });
  if (!turnstile.ok) {
    return NextResponse.json({ error: 'Turnstile verification failed.' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const newEmail = parsed.data.newEmail;
  if (newEmail === user.email) {
    return NextResponse.json({ error: 'That is already your email address.' }, { status: 400 });
  }

  const passwordOk = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
  }

  const taken = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: EMAIL_ALREADY_REGISTERED }, { status: 409 });
  }

  const windowStart = new Date(Date.now() - EMAIL_CHANGE_REQUEST_WINDOW_MS);
  const recentRequests = await prisma.emailChangeVerification.count({
    where: { userId: user.id, createdAt: { gte: windowStart } },
  });
  if (recentRequests >= EMAIL_CHANGE_MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json(
      { error: 'Too many verification requests. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  const code = generateEmailChangeCode();
  const codeHash = hashEmailChangeCode(code);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.emailChangeVerification.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    await tx.emailChangeVerification.create({
      data: {
        userId: user.id,
        newEmail,
        codeHash,
        expiresAt,
      },
    });
  });

  const userName = `${user.firstName} ${user.lastName}`.trim() || newEmail;
  try {
    await sendEmailChangeVerificationCode({
      toEmail: newEmail,
      userName,
      code,
      expiresMinutes: EMAIL_CHANGE_CODE_EXPIRY_MINUTES,
    });
  } catch (e) {
    console.error('[account/email/request] send failed', user.id, e);
    return NextResponse.json({ error: 'Unable to send verification email.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    expiresAt: expiresAt.toISOString(),
    maskedEmail: maskEmail(newEmail),
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
