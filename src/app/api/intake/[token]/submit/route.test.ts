import { beforeEach, describe, expect, it, vi } from 'vitest';

type TxClient = {
  client: { update: ReturnType<typeof vi.fn> };
  intakeToken: { update: ReturnType<typeof vi.fn> };
};

const txMock: TxClient = {
  client: { update: vi.fn(async () => ({})) },
  intakeToken: { update: vi.fn(async () => ({})) },
};

const prismaMock = {
  intakeToken: {
    findUnique: vi.fn(async () => null),
  },
  $transaction: vi.fn(async <T>(fn: (tx: TxClient) => Promise<T>) => fn(txMock)),
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/intake/[token]/submit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  it('returns 404 for invalid token', async () => {
    prismaMock.intakeToken.findUnique.mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ firstName: 'A', lastName: 'B', email: '', phone: '' }),
      }),
      { params: Promise.resolve({ token: 'bad' }) }
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for used token', async () => {
    prismaMock.intakeToken.findUnique.mockResolvedValueOnce({
      id: 'it1',
      usedAt: new Date('2025-12-31T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      clientId: 'c1',
      appointment: null,
    });
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ firstName: 'A', lastName: 'B', email: '', phone: '' }),
      }),
      { params: Promise.resolve({ token: 't' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already used/i);
  });

  it('returns 400 for expired token', async () => {
    prismaMock.intakeToken.findUnique.mockResolvedValueOnce({
      id: 'it1',
      usedAt: null,
      expiresAt: new Date('2025-12-31T00:00:00.000Z'),
      clientId: 'c1',
      appointment: null,
    });
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ firstName: 'A', lastName: 'B', email: '', phone: '' }),
      }),
      { params: Promise.resolve({ token: 't' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });
});

