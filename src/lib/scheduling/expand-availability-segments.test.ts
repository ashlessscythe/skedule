import { describe, expect, it } from 'vitest';
import {
  expandAvailabilitySegments,
  filterAvailabilityRowsForStaff,
  segmentRowKey,
} from './expand-availability-segments';

const tz = 'UTC';

function weeklyRow(overrides: Partial<Parameters<typeof expandAvailabilitySegments>[0]['rows'][0]>) {
  return {
    id: 'row1',
    locationId: 'loc1',
    staffId: null,
    dayOfWeek: 1,
    startTimeLocal: '09:00',
    endTimeLocal: '17:00',
    specificDate: null,
    isBlocked: false,
    ...overrides,
  };
}

describe('filterAvailabilityRowsForStaff', () => {
  const rows = [
    weeklyRow({ id: 'all', staffId: null }),
    weeklyRow({ id: 's1', staffId: 'staff-1' }),
    weeklyRow({ id: 's2', staffId: 'staff-2' }),
  ];

  it('returns all rows when no staff filter', () => {
    expect(filterAvailabilityRowsForStaff(rows)).toHaveLength(3);
  });

  it('keeps tenant-wide rows when filtering to one staff', () => {
    const filtered = filterAvailabilityRowsForStaff(rows, 'staff-1');
    expect(filtered.map((r) => r.id)).toEqual(['all', 's1']);
  });
});

describe('expandAvailabilitySegments', () => {
  it('expands a weekly open window on the matching weekday', () => {
    const segments = expandAvailabilitySegments({
      rows: [weeklyRow({ dayOfWeek: 1 })],
      timeZone: tz,
      startUtc: new Date('2025-06-16T00:00:00.000Z'),
      endUtc: new Date('2025-06-17T00:00:00.000Z'),
      staffNameById: new Map(),
      maxDays: 1,
    });

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      kind: 'OPEN',
      dayKey: '2025-06-16',
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
      staffLabel: 'All staff',
    });
  });

  it('skips weekly rows on other weekdays', () => {
    const segments = expandAvailabilitySegments({
      rows: [weeklyRow({ dayOfWeek: 2 })],
      timeZone: tz,
      startUtc: new Date('2025-06-16T00:00:00.000Z'),
      endUtc: new Date('2025-06-17T00:00:00.000Z'),
      staffNameById: new Map(),
      maxDays: 1,
    });
    expect(segments).toHaveLength(0);
  });

  it('emits full-day blocked segment for specificDate', () => {
    const segments = expandAvailabilitySegments({
      rows: [
        weeklyRow({
          id: 'blk',
          specificDate: new Date('2025-06-16T00:00:00.000Z'),
          dayOfWeek: null,
          startTimeLocal: null,
          endTimeLocal: null,
          isBlocked: true,
        }),
      ],
      timeZone: tz,
      startUtc: new Date('2025-06-16T00:00:00.000Z'),
      endUtc: new Date('2025-06-17T00:00:00.000Z'),
      staffNameById: new Map(),
      maxDays: 1,
    });

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      kind: 'BLOCKED',
      startMinutes: 0,
      endMinutes: 24 * 60,
    });
  });

  it('respects staff filter with tenant-wide overlap', () => {
    const segments = expandAvailabilitySegments({
      rows: [
        weeklyRow({ id: 'all', staffId: null, dayOfWeek: 1 }),
        weeklyRow({ id: 's1', staffId: 'staff-1', dayOfWeek: 1, startTimeLocal: '10:00', endTimeLocal: '14:00' }),
        weeklyRow({ id: 's2', staffId: 'staff-2', dayOfWeek: 1 }),
      ],
      timeZone: tz,
      startUtc: new Date('2025-06-16T00:00:00.000Z'),
      endUtc: new Date('2025-06-17T00:00:00.000Z'),
      staffNameById: new Map([['staff-1', 'Alex']]),
      staffIdFilter: 'staff-1',
      maxDays: 1,
    });

    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.staffLabel).sort()).toEqual(['Alex', 'All staff']);
  });

  it('uses staff display names from the map', () => {
    const segments = expandAvailabilitySegments({
      rows: [weeklyRow({ staffId: 'staff-1', dayOfWeek: 1 })],
      timeZone: tz,
      startUtc: new Date('2025-06-16T00:00:00.000Z'),
      endUtc: new Date('2025-06-17T00:00:00.000Z'),
      staffNameById: new Map([['staff-1', 'Jordan Lee']]),
      maxDays: 1,
    });
    expect(segments[0]?.staffLabel).toBe('Jordan Lee');
  });
});

describe('segmentRowKey', () => {
  it('maps null staff to __all__', () => {
    expect(segmentRowKey(null)).toBe('__all__');
    expect(segmentRowKey('staff-1')).toBe('staff-1');
  });
});
