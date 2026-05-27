import { describe, expect, it } from 'vitest';
import {
  formatDashboardDateTime,
  formatDashboardDateTimeWithZoneHint,
  formatDashboardTimeOfDay,
  formatDashboardTimeRangeWithZoneHint,
  formatTimeZoneDisplayHint,
  formatUtcInTimeZone,
  utcToZoned,
} from './time';

describe('formatUtcInTimeZone', () => {
  it('formats a UTC instant in a timezone', () => {
    const d = new Date('2025-06-15T14:00:00.000Z');
    const s = formatUtcInTimeZone(d, 'UTC', 'yyyy-MM-dd HH:mm');
    expect(s).toBe('2025-06-15 14:00');
  });
});

describe('dashboard time display', () => {
  it('formats the same wall clock for appointments list and calendar', () => {
    const instant = '2026-01-15T19:30:00.000Z';
    const tz = 'America/New_York';
    expect(formatDashboardDateTime(instant, tz)).toBe('Jan 15, 2026 14:30');
    expect(formatDashboardTimeOfDay(instant, tz)).toBe('14:30');
  });

  it('does not show raw UTC ISO strings in dashboard formats', () => {
    const instant = '2026-01-15T19:30:00.000Z';
    const formatted = formatDashboardDateTime(instant, 'America/New_York');
    expect(formatted).not.toContain('T19:30');
    expect(formatted).not.toContain('Z');
  });

  it('labels matching viewer timezone as local time', () => {
    const instant = '2026-01-15T19:30:00.000Z';
    expect(formatTimeZoneDisplayHint('America/New_York', 'America/New_York', instant)).toBe(
      'local time'
    );
    expect(formatDashboardDateTimeWithZoneHint(instant, 'America/New_York', 'America/New_York')).toBe(
      'Jan 15, 2026 14:30 (local time)'
    );
  });

  it('labels a different location timezone with IANA id and UTC offset', () => {
    const instant = '2026-01-15T19:30:00.000Z';
    expect(formatTimeZoneDisplayHint('America/Denver', 'America/New_York', instant)).toBe(
      'America/Denver · UTC-7'
    );
    expect(
      formatDashboardTimeRangeWithZoneHint(
        instant,
        '2026-01-15T20:30:00.000Z',
        'America/Denver',
        'America/New_York'
      )
    ).toBe('12:30–13:30 (America/Denver · UTC-7)');
  });
});

describe('utcToZoned', () => {
  it('returns a Date with the same wall-clock fields in the target timezone', () => {
    const d = new Date('2025-06-15T14:00:00.000Z');
    const zoned = utcToZoned(d, 'America/New_York');
    // `toZonedTime` shifts the instant so local getters show the target timezone wall clock.
    expect(zoned.getFullYear()).toBe(2025);
    expect(zoned.getMonth()).toBe(5); // June
    expect(zoned.getDate()).toBe(15);
    expect(zoned.getHours()).toBe(10); // 14:00Z = 10:00 in America/New_York (EDT)
  });
});

