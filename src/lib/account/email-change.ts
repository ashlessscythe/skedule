import crypto from 'crypto';
import type { Prisma } from '@prisma/client';

export const EMAIL_CHANGE_CODE_EXPIRY_MINUTES = 15;
export const EMAIL_CHANGE_MAX_REQUESTS_PER_WINDOW = 5;
export const EMAIL_CHANGE_REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const EMAIL_CHANGE_MAX_VERIFY_ATTEMPTS = 5;

export const EMAIL_ALREADY_REGISTERED = 'Email is already registered.';

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function generateEmailChangeCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashEmailChangeCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

type AccountTx = Pick<
  Prisma.TransactionClient,
  'passwordResetToken' | 'user'
>;

export async function invalidatePasswordResetTokens(userId: string, tx: AccountTx) {
  await tx.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
}

export async function bumpSessionVersion(userId: string, tx: AccountTx) {
  await tx.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
