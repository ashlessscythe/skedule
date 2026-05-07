import { describe, expect, it, vi } from 'vitest';
import { writeAuditLog } from './audit';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

describe('writeAuditLog', () => {
  it('creates an audit log row with expected shape', async () => {
    await writeAuditLog({
      tenantId: 't1',
      userId: 'u1',
      action: 'APPOINTMENT_CREATED' as any,
      entityType: 'Appointment',
      entityId: 'a1',
      appointmentId: 'a1',
      clientId: 'c1',
      metadata: { k: 'v' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.auditLog.create).mock.calls[0]![0];
    expect(arg.data.tenantId).toBe('t1');
    expect(arg.data.userId).toBe('u1');
    expect(arg.data.entityType).toBe('Appointment');
    expect(arg.data.entityId).toBe('a1');
    expect(arg.data.metadata).toEqual({ k: 'v' });
  });
});

