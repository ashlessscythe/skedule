import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email/registration-emails', () => ({
  sendRegistrationPendingEmailToUser: vi.fn(async () => undefined),
  notifyTenantAdminsOfPendingRegistration: vi.fn(async () => undefined),
}));

const prismaMock = {
  user: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => null),
  },
  tenant: {
    findUnique: vi.fn(async () => null),
  },
  userTenant: {
    create: vi.fn(async () => null),
  },
  $transaction: vi.fn(async (fn: (tx: typeof prismaMock) => unknown) => await fn(prismaMock)),
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEFAULT_TENANT_SLUG = 'acme-health';
  });

  it('returns 409 when email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u1' });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          email: 'EXISTING@example.com',
          password: 'password123',
          firstName: 'A',
          lastName: 'B',
        }),
      })
    );

    expect(res.status).toBe(409);
  });

  it('creates user and pending membership in default tenant', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.tenant.findUnique.mockResolvedValueOnce({ id: 't1', name: 'Clinic' });
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'u-new',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
    });
    prismaMock.userTenant.create.mockResolvedValueOnce({ id: 'ut1', status: 'PENDING', role: 'STAFF' });

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          email: 'NEW@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.userId).toBe('u-new');
    expect(body.tenantId).toBe('t1');
    expect(body.status).toBe('PENDING');

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.userTenant.create).toHaveBeenCalledTimes(1);
  });
});

