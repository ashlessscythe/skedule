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
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({})),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

describe('/api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET scopes list to tenantId for non-admin users', async () => {
    prismaMock.client.findMany.mockResolvedValueOnce([]);
    const { GET } = await import('./route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      })
    );
  });
});

