import { describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  txFindUnique: vi.fn(),
  txUpdateClient: vi.fn(),
  txUpdateToken: vi.fn(),
}));

type Tx = {
  client: { findUnique: (...args: unknown[]) => unknown; update: (...args: unknown[]) => unknown };
  intakeToken: { update: (...args: unknown[]) => unknown };
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    intakeToken: {
      findUnique: (...args: unknown[]) => prismaMocks.findUnique(...args),
    },
    $transaction: async (fn: (tx: Tx) => unknown) =>
      fn({
        client: {
          findUnique: (...args: unknown[]) => prismaMocks.txFindUnique(...args),
          update: (...args: unknown[]) => prismaMocks.txUpdateClient(...args),
        },
        intakeToken: {
          update: (...args: unknown[]) => prismaMocks.txUpdateToken(...args),
        },
      }),
  },
}));

import { POST } from './route';

describe('/api/intake/[token]/submit', () => {
  it('merges metadata into Client.metadata', async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: 'it1',
      token: 'tok',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      clientId: 'c1',
      appointment: null,
      client: { id: 'c1', tenantId: 't1' },
    });

    prismaMocks.txFindUnique.mockResolvedValue({ metadata: { a: 1, keep: true } });
    prismaMocks.txUpdateClient.mockResolvedValue({});
    prismaMocks.txUpdateToken.mockResolvedValue({});

    const res = await POST(
      new Request('http://test.local/api/intake/tok/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: 'A',
          lastName: 'B',
          email: 'a@example.com',
          phone: '',
          metadata: { a: 2, b: 'x' },
        }),
      }),
      { params: Promise.resolve({ token: 'tok' }) }
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.txUpdateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({
          metadata: { a: 2, b: 'x', keep: true },
        }),
      })
    );
  });

  it('rejects metadata with too many keys', async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: 'it1',
      token: 'tok',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      clientId: 'c1',
      appointment: null,
      client: { id: 'c1', tenantId: 't1' },
    });
    const metadata: Record<string, string> = {};
    for (let i = 0; i < 60; i++) metadata[`k${i}`] = 'v';

    await expect(
      POST(
        new Request('http://test.local/api/intake/tok/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            firstName: 'A',
            lastName: 'B',
            email: 'a@example.com',
            phone: '',
            metadata,
          }),
        }),
        { params: Promise.resolve({ token: 'tok' }) }
      )
    ).rejects.toBeTruthy();
  });
});

