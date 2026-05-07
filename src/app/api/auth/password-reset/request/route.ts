import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email/password-reset-emails';
import { generateOpaqueToken } from '@/lib/security/tokens';
import { verifyTurnstile } from '@/lib/security/turnstile';

const RequestSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1),
});

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse({
    ...json,
    email: typeof json?.email === 'string' ? json.email.toLowerCase().trim() : json?.email,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const turnstile = await verifyTurnstile({ token: parsed.data.turnstileToken, headers: req.headers });
  if (!turnstile.ok) {
    return NextResponse.json({ error: 'Turnstile verification failed.' }, { status: 403 });
  }

  // Always return success to avoid leaking whether an email exists.
  const genericOk = NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
  });
  if (!user || !user.isActive) return genericOk;

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/+$/, '') ?? '';
  if (!baseUrl) return genericOk;

  const token = generateOpaqueToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });
  } catch (e) {
    console.error('[password-reset] token create failed', e);
    return genericOk;
  }

  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  try {
    await sendPasswordResetEmail({
      userEmail: user.email,
      userName,
      resetUrl,
    });
  } catch (e) {
    console.error('[password-reset] email failed', e);
  }

  return genericOk;
}

