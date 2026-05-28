import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(async () => ({ count: 1 })),
  create: vi.fn(async () => ({
    token: 'new-qr-token',
    expiresAt: new Date('2026-01-01T11:00:00.000Z'),
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    qrToken: {
      findFirst: (...args: unknown[]) => prismaMocks.findFirst(...args),
      updateMany: (...args: unknown[]) => prismaMocks.updateMany(...args),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        qrToken: {
          updateMany: (...args: unknown[]) => prismaMocks.updateMany(...args),
          create: (...args: unknown[]) => prismaMocks.create(...args),
        },
      }),
  },
}));

vi.mock('@/lib/security/tokens', () => ({
  generateOpaqueToken: vi.fn(() => 'new-qr-token'),
}));

describe('ensureAppointmentQrToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    process.env.NEXTAUTH_URL = 'https://clinic.example.com';
  });

  it('returns existing active token when rotate is false', async () => {
    prismaMocks.findFirst.mockResolvedValueOnce({
      token: 'existing-token',
      expiresAt: new Date('2026-01-01T11:00:00.000Z'),
    });

    const { ensureAppointmentQrToken } = await import('./qr-token');
    const result = await ensureAppointmentQrToken({
      tenantId: 't1',
      appointmentId: 'a1',
      expiresAt: new Date('2026-01-01T11:00:00.000Z'),
      rotate: false,
    });

    expect(result.token).toBe('existing-token');
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
    expect(prismaMocks.create).not.toHaveBeenCalled();
  });

  it('invalidates and creates when rotate is true', async () => {
    const { ensureAppointmentQrToken } = await import('./qr-token');
    const result = await ensureAppointmentQrToken({
      tenantId: 't1',
      appointmentId: 'a1',
      expiresAt: new Date('2026-01-01T11:00:00.000Z'),
      rotate: true,
    });

    expect(result.token).toBe('new-qr-token');
    expect(prismaMocks.updateMany).toHaveBeenCalled();
    expect(prismaMocks.create).toHaveBeenCalled();
  });
});

describe('buildCheckinUrls', () => {
  it('builds absolute urls from NEXTAUTH_URL', async () => {
    process.env.NEXTAUTH_URL = 'https://clinic.example.com/';
    const { buildCheckinUrls } = await import('./qr-token');
    const urls = buildCheckinUrls('tok');
    expect(urls.checkinUrl).toBe('https://clinic.example.com/checkin/tok');
    expect(urls.pdfUrl).toBe('https://clinic.example.com/api/pdf/appointment-card/tok');
    expect(urls.qrImageUrl).toBe('https://clinic.example.com/api/qr/tok/image');
  });
});
