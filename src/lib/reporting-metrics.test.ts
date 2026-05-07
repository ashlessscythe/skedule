import { describe, expect, it } from 'vitest';
import {
  computeNoShowRate,
  computeUtilization,
  countWeekdayOccurrencesInUtcDateRangeInclusive,
  minutesBetweenLocalTimes,
} from '@/lib/reporting-metrics';

describe('reporting-metrics', () => {
  it('computeNoShowRate uses completed + no-show denominator', () => {
    expect(computeNoShowRate({ completedCount: 0, noShowCount: 0 })).toBe(0);
    expect(computeNoShowRate({ completedCount: 10, noShowCount: 0 })).toBe(0);
    expect(computeNoShowRate({ completedCount: 0, noShowCount: 2 })).toBe(1);
    expect(computeNoShowRate({ completedCount: 8, noShowCount: 2 })).toBeCloseTo(0.2);
  });

  it('computeUtilization returns 0 when no availability', () => {
    expect(computeUtilization({ bookedMinutes: 50, availableMinutes: 0 })).toBe(0);
    expect(computeUtilization({ bookedMinutes: 50, availableMinutes: -10 })).toBe(0);
  });

  it('minutesBetweenLocalTimes returns minutes for valid ranges', () => {
    expect(minutesBetweenLocalTimes({ startTimeLocal: '09:00', endTimeLocal: '10:30' })).toBe(90);
    expect(minutesBetweenLocalTimes({ startTimeLocal: '10:30', endTimeLocal: '10:30' })).toBe(0);
    expect(minutesBetweenLocalTimes({ startTimeLocal: 'bad', endTimeLocal: '10:30' })).toBe(0);
  });

  it('countWeekdayOccurrencesInUtcDateRangeInclusive counts days inclusively', () => {
    // 2026-05-04 is Monday, 2026-05-10 is Sunday
    const start = new Date(Date.UTC(2026, 4, 4));
    const end = new Date(Date.UTC(2026, 4, 10));
    expect(countWeekdayOccurrencesInUtcDateRangeInclusive({ startDateUtc: start, endDateUtc: end, dayOfWeek: 1 })).toBe(
      1
    ); // Monday
    expect(countWeekdayOccurrencesInUtcDateRangeInclusive({ startDateUtc: start, endDateUtc: end, dayOfWeek: 0 })).toBe(
      1
    ); // Sunday
  });
});

