import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({ userId: 'admin', tenantId: 't1', role: 'ADMIN' })),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

const prismaMock = {
  userTenant: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(
      async (args: { data: { tenantId: string; userId: string; role: string; status: string } }) => ({
      id: 'ut1',
      tenantId: args.data.tenantId,
      userId: args.data.userId,
      role: args.data.role,
      status: args.data.status,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      user: {
        id: args.data.userId,
        email: 'x@example.com',
        firstName: 'X',
        lastName: 'Y',
        isActive: true,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    })
    ),
  },
  user: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: 'u-new' })),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/admin/staff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns tenant members list', async () => {
    prismaMock.userTenant.findMany.mockResolvedValueOnce([
      {
        id: 'ut1',
        tenantId: 't1',
        userId: 'u1',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        user: {
          id: 'u1',
          email: 'a@example.com',
          firstName: 'A',
          lastName: 'B',
          isActive: true,
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
        },
      },
    ]);

    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].user.email).toBe('a@example.com');
  });

  it('POST rejects new user without required fields', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', role: 'STAFF', status: 'ACTIVE' }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required for new users/i);
  });

  it('POST links existing user by email', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u-existing' });
    prismaMock.userTenant.findUnique.mockResolvedValueOnce(null);

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          email: 'EXISTING@example.com',
          role: 'ADMIN',
          status: 'PENDING',
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.userId).toBe('u-existing');
    expect(body.role).toBe('ADMIN');
    expect(body.status).toBe('PENDING');
  });
});

