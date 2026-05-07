import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({
    userId: 'u1',
    tenantId: 't1',
    role: 'ADMIN',
  })),
}));

const assertWithinAvailabilityMock = vi.fn(async () => undefined);
vi.mock('@/lib/scheduling/availability', () => ({
  assertWithinAvailability: (...args: unknown[]) => assertWithinAvailabilityMock(...args),
}));

const assertNoConflictMock = vi.fn(async () => undefined);
vi.mock('@/lib/scheduling/conflicts', () => ({
  assertNoConflict: (...args: unknown[]) => assertNoConflictMock(...args),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

const sendCancelledMock = vi.fn(async () => undefined);
const sendUpdatedMock = vi.fn(async () => undefined);
vi.mock('@/lib/email/appointment-emails', () => ({
  apptEmailInclude: {},
  sendAppointmentCancelledEmailForClient: (...args: unknown[]) => sendCancelledMock(...args),
  sendAppointmentUpdatedEmailForClient: (...args: unknown[]) => sendUpdatedMock(...args),
}));

const prismaMock = {
  appointment: {
    findFirst: vi.fn(async () => null),
    update: vi.fn(async () => null),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/appointments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATCH reschedule resets reminderSentAt', async () => {
    prismaMock.appointment.findFirst.mockResolvedValueOnce({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      staffId: 's1',
      clientId: 'c1',
      status: 'SCHEDULED',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T10:30:00.000Z'),
      reminderSentAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    prismaMock.appointment.update.mockResolvedValueOnce({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      staffId: 's1',
      clientId: 'c1',
      status: 'SCHEDULED',
      startTime: new Date('2026-01-02T10:00:00.000Z'),
      endTime: new Date('2026-01-02T10:30:00.000Z'),
      reminderSentAt: null,
      deletedAt: null,
    });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({
          startTime: '2026-01-02T10:00:00.000Z',
          endTime: '2026-01-02T10:30:00.000Z',
        }),
      }),
      { params: Promise.resolve({ id: 'a1' }) }
    );

    expect(res.status).toBe(200);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({
          reminderSentAt: null,
        }),
      })
    );
  });

  it('PATCH CANCELLED triggers cancel email path', async () => {
    prismaMock.appointment.findFirst.mockResolvedValueOnce({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      staffId: 's1',
      clientId: 'c1',
      status: 'SCHEDULED',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T10:30:00.000Z'),
      reminderSentAt: null,
      deletedAt: null,
    });

    prismaMock.appointment.update.mockResolvedValueOnce({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      staffId: 's1',
      clientId: 'c1',
      status: 'CANCELLED',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T10:30:00.000Z'),
      reminderSentAt: null,
      deletedAt: null,
    });

    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://test', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
      { params: Promise.resolve({ id: 'a1' }) }
    );

    expect(res.status).toBe(200);
    expect(sendCancelledMock).toHaveBeenCalledTimes(1);
    expect(sendUpdatedMock).not.toHaveBeenCalled();
  });

  it('DELETE cancels appointment and triggers cancel email path', async () => {
    prismaMock.appointment.findFirst.mockResolvedValueOnce({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      staffId: 's1',
      clientId: 'c1',
      status: 'SCHEDULED',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T10:30:00.000Z'),
      reminderSentAt: null,
      deletedAt: null,
    });
    prismaMock.appointment.update.mockResolvedValueOnce({
      id: 'a1',
      status: 'CANCELLED',
      deletedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const { DELETE } = await import('./route');
    const res = await DELETE(new Request('http://test', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'a1' }),
    });

    expect(res.status).toBe(200);
    expect(sendCancelledMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({ status: 'CANCELLED', deletedAt: expect.any(Date) }),
      })
    );
  });
});

