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

vi.mock('@/lib/email/account-emails', () => ({
  sendAdminEmailChangedNotice: vi.fn(async () => undefined),
}));

vi.mock('@/lib/staff/last-admin-guard', () => ({
  getLastAdminGuardError: vi.fn(async () => null),
}));

const prismaMock = {
  userTenant: {
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => null),
    count: vi.fn(async () => 0),
  },
  user: {
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => null),
  },
  tenant: {
    findUnique: vi.fn(async () => ({ name: 'Clinic' })),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: { update: prismaMock.user.update },
      passwordResetToken: { updateMany: vi.fn(async () => ({ count: 0 })) },
    })
  ),
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/admin/staff/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: prismaMock.user.update },
        passwordResetToken: { updateMany: vi.fn(async () => ({ count: 0 })) },
      })
    );
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
      user: {
        id: 'u1',
        email: 'a@example.com',
        firstName: 'A',
        lastName: 'B',
        isActive: true,
      },
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

  it('PATCH blocks last admin demotion', async () => {
    const { getLastAdminGuardError } = await import('@/lib/staff/last-admin-guard');
    vi.mocked(getLastAdminGuardError).mockResolvedValueOnce(
      'Cannot remove the last active administrator for this organization.'
    );

    prismaMock.userTenant.findFirst.mockResolvedValueOnce({
      id: 'ut1',
      role: 'ADMIN',
      status: 'ACTIVE',
      userId: 'u1',
      user: {
        id: 'u1',
        email: 'admin@example.com',
        firstName: 'A',
        lastName: 'B',
        isActive: true,
      },
    });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'STAFF' }),
      }),
      { params: Promise.resolve({ id: 'ut1' }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/last active administrator/i);
  });

  it('PATCH returns 409 when email is already registered', async () => {
    const { getLastAdminGuardError } = await import('@/lib/staff/last-admin-guard');
    vi.mocked(getLastAdminGuardError).mockResolvedValueOnce(null);

    prismaMock.userTenant.findFirst.mockResolvedValueOnce({
      id: 'ut1',
      role: 'STAFF',
      status: 'ACTIVE',
      userId: 'u1',
      user: {
        id: 'u1',
        email: 'a@example.com',
        firstName: 'A',
        lastName: 'B',
        isActive: true,
      },
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'other-user' });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'taken@example.com' }),
      }),
      { params: Promise.resolve({ id: 'ut1' }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already registered/i);
  });
});
