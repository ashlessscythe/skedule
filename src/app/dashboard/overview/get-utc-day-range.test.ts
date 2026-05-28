import { describe, expect, it } from 'vitest';
import { getUtcDayRange } from './get-utc-day-range';

describe('getUtcDayRange', () => {
  it('returns UTC midnight through end of day for the given instant', () => {
    const ref = new Date('2026-05-28T15:30:00.000Z');
    const { start, end } = getUtcDayRange(ref);

    expect(start.toISOString()).toBe('2026-05-28T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-28T23:59:59.999Z');
  });

  it('uses the UTC calendar date when local offset crosses midnight', () => {
    const ref = new Date('2026-05-28T23:45:00.000Z');
    const { start, end } = getUtcDayRange(ref);

    expect(start.toISOString()).toBe('2026-05-28T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-28T23:59:59.999Z');
  });

  it('advances to the next UTC day after 23:59:59.999Z', () => {
    const ref = new Date('2026-05-28T23:59:59.999Z');
    const next = new Date(ref.getTime() + 1);
    const { start } = getUtcDayRange(next);

    expect(start.toISOString()).toBe('2026-05-29T00:00:00.000Z');
  });
});
