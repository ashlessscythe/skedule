import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({ userId: 'admin', tenantId: 't1', role: 'ADMIN' })),
  requireAdmin: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

vi.mock('@/lib/email/registration-emails', () => ({
  sendRegistrationApprovedEmailToUser: vi.fn(async () => undefined),
}));

const prismaMock = {
  userTenant: {
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => null),
  },
  tenant: {
    findUnique: vi.fn(async () => ({ name: 'Clinic' })),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/admin/staff/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCH returns 404 when membership not found', async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce(null);
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', { method: 'PATCH', body: JSON.stringify({ role: 'ADMIN' }) }),
      { params: Promise.resolve({ id: 'missing' }) }
    );
    expect(res.status).toBe(404);
  });

  it('PATCH updates membership role/status', async () => {
    prismaMock.userTenant.findFirst.mockResolvedValueOnce({
      id: 'ut1',
      role: 'STAFF',
      status: 'PENDING',
      userId: 'u1',
    });
    prismaMock.userTenant.update.mockResolvedValueOnce({
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
    });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'ADMIN', status: 'ACTIVE' }),
      }),
      { params: Promise.resolve({ id: 'ut1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe('ADMIN');
    expect(body.status).toBe('ACTIVE');

    const { sendRegistrationApprovedEmailToUser } = await import('@/lib/email/registration-emails');
    expect(vi.mocked(sendRegistrationApprovedEmailToUser)).toHaveBeenCalledTimes(1);
  });
});

