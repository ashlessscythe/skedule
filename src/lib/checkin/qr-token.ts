import { prisma } from '@/lib/prisma';
import { generateOpaqueToken } from '@/lib/security/tokens';
import { appUrl } from '@/lib/app-url';

export type QrTokenRecord = {
  token: string;
  expiresAt: Date;
};

export function buildCheckinUrls(token: string) {
  return {
    checkinUrl: appUrl(`/checkin/${token}`),
    pdfUrl: appUrl(`/api/pdf/appointment-card/${token}`),
    qrImageUrl: appUrl(`/api/qr/${token}/image`),
  };
}

export async function expireQrTokensForAppointment(appointmentId: string, now = new Date()) {
  await prisma.qrToken.updateMany({
    where: {
      appointmentId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { expiresAt: now },
  });
}

export async function ensureAppointmentQrToken(args: {
  tenantId: string;
  appointmentId: string;
  expiresAt: Date;
  rotate?: boolean;
}): Promise<QrTokenRecord> {
  const now = new Date();
  const rotate = args.rotate ?? false;

  if (!rotate) {
    const existing = await prisma.qrToken.findFirst({
      where: {
        tenantId: args.tenantId,
        appointmentId: args.appointmentId,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: { token: true, expiresAt: true },
    });
    if (existing) return existing;
  }

  return prisma.$transaction(async (tx) => {
    await tx.qrToken.updateMany({
      where: {
        tenantId: args.tenantId,
        appointmentId: args.appointmentId,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });

    const token = generateOpaqueToken(32);
    const created = await tx.qrToken.create({
      data: {
        tenantId: args.tenantId,
        appointmentId: args.appointmentId,
        token,
        expiresAt: args.expiresAt,
      },
      select: { token: true, expiresAt: true },
    });
    return created;
  });
}

export async function findNewerActiveQrToken(args: {
  appointmentId: string;
  excludeToken: string;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  return prisma.qrToken.findFirst({
    where: {
      appointmentId: args.appointmentId,
      token: { not: args.excludeToken },
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { token: true },
  });
}
