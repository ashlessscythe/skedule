import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({
    userId: 'u-staff',
    tenantId: 't1',
    role: 'STAFF',
  })),
}));

const prismaMock = {
  client: {
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => null),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

describe('/api/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCH returns 404 when client not found for tenant', async () => {
    prismaMock.client.findFirst.mockResolvedValueOnce(null);
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'X' }),
      }),
      { params: Promise.resolve({ id: 'c-cross-tenant' }) }
    );

    expect(res.status).toBe(404);
    expect(prismaMock.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'c-cross-tenant', tenantId: 't1' }),
      })
    );
  });

  it('DELETE returns 404 when client not found for tenant', async () => {
    prismaMock.client.findFirst.mockResolvedValueOnce(null);
    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'c-cross-tenant' }),
    });

    expect(res.status).toBe(404);
    expect(prismaMock.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'c-cross-tenant', tenantId: 't1' }),
      })
    );
  });
});

