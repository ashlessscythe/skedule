import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(async () => null),
  qrUpdate: vi.fn(async () => ({})),
  apptUpdate: vi.fn(async () => ({})),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    qrToken: {
      findUnique: (...args: unknown[]) => prismaMocks.findUnique(...args),
    },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        qrToken: { update: (...args: unknown[]) => prismaMocks.qrUpdate(...args) },
        appointment: { update: (...args: unknown[]) => prismaMocks.apptUpdate(...args) },
      }),
  },
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

describe('/api/qr/[token]', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  it('returns 404 for invalid token', async () => {
    prismaMocks.findUnique.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 'bad' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for already used token', async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: new Date('2025-12-31T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      appointment: {
        id: 'a1',
        status: 'SCHEDULED',
        deletedAt: null,
        tenantId: 't1',
        clientId: 'c1',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already checked in/i);
  });

  it('returns 400 for expired token', async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: null,
      expiresAt: new Date('2025-12-31T00:00:00.000Z'),
      appointment: {
        id: 'a1',
        status: 'SCHEDULED',
        deletedAt: null,
        tenantId: 't1',
        clientId: 'c1',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it('returns 400 for cancelled appointment', async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: null,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      appointment: {
        id: 'a1',
        status: 'CANCELLED',
        deletedAt: null,
        tenantId: 't1',
        clientId: 'c1',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cancelled/i);
  });

  it('marks appointment CHECKED_IN on success', async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: null,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      appointment: {
        id: 'a1',
        status: 'SCHEDULED',
        deletedAt: null,
        tenantId: 't1',
        clientId: 'c1',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(200);
    expect(prismaMocks.apptUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { status: 'CHECKED_IN' },
      })
    );
  });
});
