import { describe, expect, it, vi, beforeEach } from 'vitest';
import { assertNoConflict } from './conflicts';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
    },
  },
}));

describe('assertNoConflict', () => {
  beforeEach(() => {
    vi.mocked(prisma.appointment.findFirst).mockReset();
  });

  it('returns immediately when staffId is not provided', async () => {
    await assertNoConflict({
      tenantId: 't1',
      staffId: null,
      locationId: 'l1',
      startTimeUtc: new Date('2025-06-15T14:00:00.000Z'),
      endTimeUtc: new Date('2025-06-15T14:30:00.000Z'),
    });
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it('throws when a conflict exists', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: 'appt-conflict',
      startTime: new Date(),
      endTime: new Date(),
    } as { id: string; startTime: Date; endTime: Date });

    await expect(
      assertNoConflict({
        tenantId: 't1',
        staffId: 's1',
        locationId: 'l1',
        startTimeUtc: new Date('2025-06-15T14:00:00.000Z'),
        endTimeUtc: new Date('2025-06-15T14:30:00.000Z'),
      })
    ).rejects.toThrow(/Conflict with appointment appt-conflict/);
  });

  it('does not throw when no conflict exists', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
    await expect(
      assertNoConflict({
        tenantId: 't1',
        staffId: 's1',
        locationId: 'l1',
        startTimeUtc: new Date('2025-06-15T14:00:00.000Z'),
        endTimeUtc: new Date('2025-06-15T14:30:00.000Z'),
        excludeAppointmentId: 'a1',
      })
    ).resolves.toBeUndefined();
  });
});

