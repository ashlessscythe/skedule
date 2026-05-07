import { describe, expect, it, vi } from 'vitest';
import { buildAuditLogWhere, listAuditLogsForTenant } from '@/lib/audit-query';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(async () => []),
    },
  },
}));

describe('audit-query', () => {
  it('buildAuditLogWhere only includes provided filters', () => {
    expect(buildAuditLogWhere({ tenantId: 't1' })).toEqual({ tenantId: 't1' });

    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T23:59:59.999Z');
    expect(
      buildAuditLogWhere({
        tenantId: 't1',
        startDate: start,
        endDate: end,
        entityType: 'Appointment',
        userId: 'u1',
      })
    ).toEqual({
      tenantId: 't1',
      createdAt: { gte: start, lte: end },
      entityType: 'Appointment',
      userId: 'u1',
    });
  });

  it('listAuditLogsForTenant queries prisma with expected where', async () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-31T23:59:59.999Z');

    await listAuditLogsForTenant({
      tenantId: 't1',
      startDate: start,
      endDate: end,
      entityType: 'Client',
      userId: 'u2',
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0];
    expect(arg.where).toEqual({
      tenantId: 't1',
      createdAt: { gte: start, lte: end },
      entityType: 'Client',
      userId: 'u2',
    });
    expect(arg.take).toBe(100);
  });
});

