import { describe, expect, it, vi, beforeEach } from 'vitest';
import { assertWithinAvailability } from './availability';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    location: {
      findFirst: vi.fn(),
    },
    availability: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('assertWithinAvailability', () => {
  const baseArgs = {
    tenantId: 't1',
    locationId: 'l1',
    staffId: 's1',
    startTimeUtc: new Date('2025-06-16T14:00:00.000Z'), // Monday
    endTimeUtc: new Date('2025-06-16T14:30:00.000Z'),
  };

  beforeEach(() => {
    vi.mocked(prisma.location.findFirst).mockReset();
    vi.mocked(prisma.availability.findFirst).mockReset();
    vi.mocked(prisma.availability.findMany).mockReset();
  });

  it('throws when location is missing', async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue(null);
    await expect(assertWithinAvailability(baseArgs)).rejects.toThrow(/Invalid location/);
  });

  it('throws when blocked for that specific date', async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({ timeZone: 'UTC' } as { timeZone: string });
    vi.mocked(prisma.availability.findFirst).mockResolvedValue({ id: 'blk' } as { id: string });
    await expect(assertWithinAvailability(baseArgs)).rejects.toThrow(/Unavailable \(blocked date\)/);
  });

  it('throws when no weekly windows exist', async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({ timeZone: 'UTC' } as { timeZone: string });
    vi.mocked(prisma.availability.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.availability.findMany).mockResolvedValue([]);
    await expect(assertWithinAvailability(baseArgs)).rejects.toThrow(/No availability configured/);
  });

  it('throws when outside configured windows', async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({ timeZone: 'UTC' } as { timeZone: string });
    vi.mocked(prisma.availability.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.availability.findMany).mockResolvedValue([
      { startTimeLocal: '09:00', endTimeLocal: '10:00' },
    ] as { startTimeLocal: string; endTimeLocal: string }[]);
    await expect(assertWithinAvailability(baseArgs)).rejects.toThrow(/Outside availability/);
  });

  it('resolves when within a configured window', async () => {
    vi.mocked(prisma.location.findFirst).mockResolvedValue({ timeZone: 'UTC' } as { timeZone: string });
    vi.mocked(prisma.availability.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.availability.findMany).mockResolvedValue([
      { startTimeLocal: '13:00', endTimeLocal: '15:00' },
    ] as { startTimeLocal: string; endTimeLocal: string }[]);
    await expect(assertWithinAvailability(baseArgs)).resolves.toBeUndefined();
  });
});

