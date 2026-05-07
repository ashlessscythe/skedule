import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  qrToken: {
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/qr/[token]', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  it('returns 404 for invalid token', async () => {
    prismaMock.qrToken.findUnique.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 'bad' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for already used token', async () => {
    prismaMock.qrToken.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: new Date('2025-12-31T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      appointment: { id: 'a1', status: 'SCHEDULED', deletedAt: null },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already used/i);
  });

  it('returns 400 for expired token', async () => {
    prismaMock.qrToken.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: null,
      expiresAt: new Date('2025-12-31T00:00:00.000Z'),
      appointment: { id: 'a1', status: 'SCHEDULED', deletedAt: null },
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
    prismaMock.qrToken.findUnique.mockResolvedValueOnce({
      id: 'qr1',
      usedAt: null,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      appointment: { id: 'a1', status: 'CANCELLED', deletedAt: null },
    });
    const { POST } = await import('./route');
    const res = await POST(new Request('http://test', { method: 'POST' }), {
      params: Promise.resolve({ token: 't' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cancelled/i);
  });
});

