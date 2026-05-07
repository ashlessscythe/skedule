import { describe, expect, it } from 'vitest';
import { formatUtcInTimeZone, utcToZoned } from './time';

describe('formatUtcInTimeZone', () => {
  it('formats a UTC instant in a timezone', () => {
    const d = new Date('2025-06-15T14:00:00.000Z');
    const s = formatUtcInTimeZone(d, 'UTC', 'yyyy-MM-dd HH:mm');
    expect(s).toBe('2025-06-15 14:00');
  });
});

describe('utcToZoned', () => {
  it('returns a Date with the same wall-clock fields in the target timezone', () => {
    const d = new Date('2025-06-15T14:00:00.000Z');
    const zoned = utcToZoned(d, 'America/New_York');
    // `toZonedTime` returns a Date whose *wall clock* matches the target timezone.
    // It does not preserve the original epoch milliseconds.
    expect(zoned.getUTCFullYear()).toBe(2025);
    expect(zoned.getUTCMonth()).toBe(5); // June
    expect(zoned.getUTCDate()).toBe(15);
    expect(zoned.getUTCHours()).toBe(10); // 14:00Z = 10:00 in America/New_York (EDT)
  });
});

