import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ResetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const tokenHash = sha256Hex(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, isActive: true } } },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now() || !record.user.isActive) {
    return NextResponse.json({ error: 'Reset link is invalid or expired.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}

