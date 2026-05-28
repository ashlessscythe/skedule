import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: vi.fn(async () => ({
    userId: 'u1',
    tenantId: 't1',
    role: 'STAFF',
  })),
}));

const prismaMock = {
  appointment: {
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({
      id: 'a1',
      tenantId: 't1',
      locationId: 'loc1',
      clientId: 'c1',
      staffId: 's1',
      typeId: null,
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T10:30:00.000Z'),
      notes: null,
      recurrenceRuleId: null,
      reminderSentAt: null,
      status: 'SCHEDULED',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })),
  },
  recurrenceRule: {
    create: vi.fn(async () => ({ id: 'rr1' })),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

const assertWithinAvailabilityMock = vi.fn(async () => undefined);
vi.mock('@/lib/scheduling/availability', () => ({
  assertWithinAvailability: (...args: unknown[]) => assertWithinAvailabilityMock(...args),
}));

const assertNoConflictMock = vi.fn(async () => undefined);
vi.mock('@/lib/scheduling/conflicts', () => ({
  assertNoConflict: (...args: unknown[]) => assertNoConflictMock(...args),
}));

const expandRecurrenceExtraStartTimesMock = vi.fn(() => []);
vi.mock('@/lib/scheduling/recurrence', () => ({
  MAX_RECURRENCE_SERIES_INSTANCES: 50,
  expandRecurrenceExtraStartTimes: (...args: unknown[]) =>
    expandRecurrenceExtraStartTimesMock(...args),
  toRRuleString: vi.fn(() => 'RRULE:FREQ=WEEKLY'),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
}));

vi.mock('@/lib/email/appointment-emails', () => ({
  sendAppointmentBookedEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/checkin/qr-token', () => ({
  ensureAppointmentQrToken: vi.fn(async () => ({
    token: 'qr-tok',
    expiresAt: new Date('2026-01-01T10:30:00.000Z'),
  })),
}));

describe('/api/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET scopes list to tenantId', async () => {
    prismaMock.appointment.findMany.mockResolvedValueOnce([]);
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't1' }),
      })
    );
  });

  it('POST rejects missing durationMinutes/endTime', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          locationId: 'loc1',
          clientId: 'c1',
          staffId: 's1',
          startTime: '2026-01-01T10:00:00.000Z',
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/durationMinutes or endTime/i);
    expect(assertWithinAvailabilityMock).not.toHaveBeenCalled();
    expect(assertNoConflictMock).not.toHaveBeenCalled();
  });

  it('POST preflights all recurrence slots (availability + conflict)', async () => {
    expandRecurrenceExtraStartTimesMock.mockReturnValueOnce([
      new Date('2026-01-08T10:00:00.000Z'),
      new Date('2026-01-15T10:00:00.000Z'),
    ]);

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        body: JSON.stringify({
          locationId: 'loc1',
          clientId: 'c1',
          staffId: 's1',
          startTime: '2026-01-01T10:00:00.000Z',
          durationMinutes: 30,
          recurrenceRule: { frequency: 'WEEKLY', count: 3 },
        }),
      })
    );

    expect(res.status).toBe(201);

    expect(assertWithinAvailabilityMock).toHaveBeenCalledTimes(3);
    expect(assertNoConflictMock).toHaveBeenCalledTimes(3);

    type WithinArgs = { startTimeUtc: Date };
    const withinArgs = assertWithinAvailabilityMock.mock.calls.map(
      (c) => c[0] as unknown as WithinArgs
    );
    expect(withinArgs.map((a) => a.startTimeUtc.toISOString())).toEqual([
      '2026-01-01T10:00:00.000Z',
      '2026-01-08T10:00:00.000Z',
      '2026-01-15T10:00:00.000Z',
    ]);

    type ConflictArgs = { startTimeUtc: Date };
    const conflictArgs = assertNoConflictMock.mock.calls.map(
      (c) => c[0] as unknown as ConflictArgs
    );
    expect(conflictArgs.map((a) => a.startTimeUtc.toISOString())).toEqual([
      '2026-01-01T10:00:00.000Z',
      '2026-01-08T10:00:00.000Z',
      '2026-01-15T10:00:00.000Z',
    ]);
  });
});

