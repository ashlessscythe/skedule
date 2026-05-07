import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({ userId: 'admin', tenantId: 't1', role: 'ADMIN' })),
  requireAdmin: vi.fn(),
}));

const prismaMock = {
  branding: {
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(
      async (args: {
        where: { tenantId: string };
        create: {
          logoUrl: string | null;
          primaryColor: string | null;
          secondaryColor: string | null;
          accentColor: string | null;
          emailFromName: string | null;
          emailFromAddress: string | null;
        };
      }) => ({
        tenantId: args.where.tenantId,
        logoUrl: args.create.logoUrl ?? null,
        primaryColor: args.create.primaryColor ?? null,
        secondaryColor: args.create.secondaryColor ?? null,
        accentColor: args.create.accentColor ?? null,
        emailFromName: args.create.emailFromName ?? null,
        emailFromAddress: args.create.emailFromAddress ?? null,
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      })
    ),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/admin/branding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns null branding when unset', async () => {
    prismaMock.branding.findUnique.mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.branding).toBeNull();
    expect(prismaMock.branding.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1' } })
    );
  });

  it('PUT upserts branding for tenant', async () => {
    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://test', {
        method: 'PUT',
        body: JSON.stringify({
          logoUrl: ' https://example.com/logo.png ',
          primaryColor: '#ff0000',
          emailFromName: 'Skedule',
          emailFromAddress: 'no-reply@skedule.test',
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.branding.tenantId).toBe('t1');
    expect(body.branding.logoUrl).toBe('https://example.com/logo.png');
    expect(body.branding.primaryColor).toBe('#ff0000');
    expect(body.branding.emailFromAddress).toBe('no-reply@skedule.test');
  });

  it('PUT treats empty strings as null', async () => {
    prismaMock.branding.upsert.mockResolvedValueOnce({
      tenantId: 't1',
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      emailFromName: null,
      emailFromAddress: null,
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    const { PUT } = await import('./route');
    const res = await PUT(
      new Request('http://test', {
        method: 'PUT',
        body: JSON.stringify({
          logoUrl: '   ',
          primaryColor: '',
          emailFromName: null,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.branding.logoUrl).toBeNull();
    expect(body.branding.primaryColor).toBeNull();
    expect(body.branding.emailFromName).toBeNull();
  });
});

