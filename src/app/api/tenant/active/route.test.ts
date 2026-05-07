import { describe, expect, it, vi } from 'vitest';
import { GET } from './route';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
  }),
}));

const findMany = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findMany: (...args: unknown[]) => findMany(...args),
    },
  },
}));

describe('/api/tenant/active', () => {
  it('401 when no token', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue(null);
    const res = await GET(new Request('http://test.local/api/tenant/active'));
    expect(res.status).toBe(401);
  });

  it('returns activeTenantId and tenants list', async () => {
    const { getToken } = await import('next-auth/jwt');
    vi.mocked(getToken).mockResolvedValue({
      primaryTenantId: 't1',
      roles: [
        { tenantId: 't1', role: 'ADMIN' },
        { tenantId: 't2', role: 'STAFF' },
      ],
    });

    findMany.mockResolvedValue([
      { id: 't1', name: 'Acme', slug: 'acme' },
      { id: 't2', name: 'Bravo', slug: 'bravo' },
    ]);

    const res = await GET(new Request('http://test.local/api/tenant/active'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { activeTenantId: string | null; tenants: unknown[] };
    expect(body.activeTenantId).toBe('t1');
    expect(body.tenants).toHaveLength(2);
  });
});

