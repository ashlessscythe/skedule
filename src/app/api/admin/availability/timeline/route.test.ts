import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({ userId: 'admin', tenantId: 't1', role: 'ADMIN' })),
  requireAdmin: vi.fn(),
}));

const prismaMock = {
  location: {
    findFirst: vi.fn(),
  },
  availability: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/admin/availability/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.location.findFirst.mockResolvedValue({
      id: 'loc1',
      name: 'Main',
      timeZone: 'UTC',
    });
    prismaMock.availability.findMany.mockResolvedValue([
      {
        id: 'a1',
        locationId: 'loc1',
        staffId: null,
        dayOfWeek: 1,
        startTimeLocal: '09:00',
        endTimeLocal: '17:00',
        specificDate: null,
        isBlocked: false,
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it('returns expanded segments for a valid query', async () => {
    const { GET } = await import('./route');
    const url =
      'http://localhost/api/admin/availability/timeline?locationId=loc1&start=2025-06-16T00:00:00.000Z&end=2025-06-17T00:00:00.000Z';
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location.id).toBe('loc1');
    expect(body.segments).toHaveLength(1);
    expect(body.segments[0]).toMatchObject({
      kind: 'OPEN',
      startMinutes: 540,
      endMinutes: 1020,
    });
  });

  it('rejects missing locationId', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      new Request(
        'http://localhost/api/admin/availability/timeline?start=2025-06-16T00:00:00.000Z&end=2025-06-17T00:00:00.000Z'
      )
    );
    expect(res.status).toBe(400);
  });
});
