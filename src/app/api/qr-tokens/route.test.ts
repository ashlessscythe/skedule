import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({
    userId: 'u-staff',
    tenantId: 't1',
    role: 'STAFF',
  })),
}));

const ensureMock = vi.fn(async () => ({
  token: 'qr-tok',
  expiresAt: new Date('2026-01-01T11:00:00.000Z'),
}));

vi.mock('@/lib/checkin/qr-token', () => ({
  buildCheckinUrls: vi.fn(() => ({
    checkinUrl: 'https://clinic.example.com/checkin/qr-tok',
    pdfUrl: 'https://clinic.example.com/api/pdf/appointment-card/qr-tok',
    qrImageUrl: 'https://clinic.example.com/api/qr/qr-tok/image',
  })),
  ensureAppointmentQrToken: (...args: unknown[]) => ensureMock(...args),
}));

const prismaMock = {
  appointment: {
    findFirst: vi.fn(async () => ({
      id: 'a1',
      endTime: new Date('2026-01-01T11:00:00.000Z'),
      status: 'SCHEDULED',
    })),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/qr-tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns absolute check-in and pdf urls', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/qr-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appointmentId: 'a1' }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBe('https://clinic.example.com/checkin/qr-tok');
    expect(body.pdfUrl).toContain('/api/pdf/appointment-card/qr-tok');
    expect(ensureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        appointmentId: 'a1',
        expiresAt: new Date('2026-01-01T11:00:00.000Z'),
        rotate: false,
      })
    );
  });

  it('rejects ended appointments', async () => {
    prismaMock.appointment.findFirst.mockResolvedValueOnce({
      id: 'a1',
      endTime: new Date('2025-12-31T11:00:00.000Z'),
      status: 'SCHEDULED',
    });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/qr-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appointmentId: 'a1' }),
      })
    );

    expect(res.status).toBe(400);
    expect(ensureMock).not.toHaveBeenCalled();
  });
});
