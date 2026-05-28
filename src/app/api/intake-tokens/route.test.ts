import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({
    userId: 'u-staff',
    tenantId: 't1',
    role: 'STAFF',
  })),
}));

const prismaMocks = vi.hoisted(() => ({
  updateMany: vi.fn(async () => ({ count: 0 })),
  create: vi.fn(async () => ({
    token: 'new-intake-token',
    expiresAt: new Date('2026-01-04T00:00:00.000Z'),
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (fn: (tx: typeof prismaMocks) => unknown) =>
      fn({
        intakeToken: {
          updateMany: (...args: unknown[]) => prismaMocks.updateMany(...args),
          create: (...args: unknown[]) => prismaMocks.create(...args),
        },
      }),
  },
}));

vi.mock('@/lib/security/tokens', () => ({
  generateOpaqueToken: vi.fn(() => 'new-intake-token'),
}));

describe('/api/intake-tokens', () => {
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalNextAuthUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = originalNextAuthUrl;
    }
  });

  it('returns 400 when neither clientId nor appointmentId is provided', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/appointmentId or clientId/i);
    expect(prismaMocks.updateMany).not.toHaveBeenCalled();
    expect(prismaMocks.create).not.toHaveBeenCalled();
  });

  it('returns an absolute url using NEXTAUTH_URL', async () => {
    process.env.NEXTAUTH_URL = 'https://clinic.example.com/';

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'c1' }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBe('https://clinic.example.com/intake/new-intake-token');
    expect(body.token).toBe('new-intake-token');
  });

  it('returns a relative url when NEXTAUTH_URL is unset', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'c1' }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBe('/intake/new-intake-token');
  });

  it('invalidates unused unexpired intake tokens for the same client', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'c1' }),
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMocks.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        clientId: 'c1',
        usedAt: null,
        expiresAt: { gt: new Date('2026-01-01T00:00:00.000Z') },
      },
      data: { expiresAt: new Date('2026-01-01T00:00:00.000Z') },
    });
    expect(prismaMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          clientId: 'c1',
          token: 'new-intake-token',
        }),
      })
    );
  });

  it('invalidates unused unexpired intake tokens for the same appointment', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appointmentId: 'a1' }),
      })
    );

    expect(res.status).toBe(201);
    expect(prismaMocks.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        appointmentId: 'a1',
        usedAt: null,
        expiresAt: { gt: new Date('2026-01-01T00:00:00.000Z') },
      },
      data: { expiresAt: new Date('2026-01-01T00:00:00.000Z') },
    });
    expect(prismaMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          appointmentId: 'a1',
          clientId: null,
        }),
      })
    );
  });

  it('invalidates by clientId when both clientId and appointmentId are provided', async () => {
    const { POST } = await import('./route');
    await POST(
      new Request('http://test.local/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'c1', appointmentId: 'a1' }),
      })
    );

    expect(prismaMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          clientId: 'c1',
        }),
      })
    );
    expect(prismaMocks.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ appointmentId: 'a1' }),
      })
    );
  });
});
