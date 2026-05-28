import { describe, expect, it } from 'vitest';
import {
  roundDurationMinutesUp,
  snapDateTimeLocalToQuarterHour,
  snapDateToQuarterHour,
} from './time-increments';

describe('roundDurationMinutesUp', () => {
  it('rounds up to 15-minute boundaries with a 15-minute minimum', () => {
    expect(roundDurationMinutesUp(1)).toBe(15);
    expect(roundDurationMinutesUp(15)).toBe(15);
    expect(roundDurationMinutesUp(16)).toBe(30);
    expect(roundDurationMinutesUp(20)).toBe(30);
    expect(roundDurationMinutesUp(45)).toBe(45);
  });
});

describe('snapDateToQuarterHour', () => {
  it('keeps times already on the grid', () => {
    const d = new Date(2026, 4, 7, 10, 0, 0, 0);
    const snapped = snapDateToQuarterHour(d);
    expect(snapped.getHours()).toBe(10);
    expect(snapped.getMinutes()).toBe(0);
  });

  it('rounds up partial minutes', () => {
    const d = new Date(2026, 4, 7, 10, 7, 0, 0);
    const snapped = snapDateToQuarterHour(d);
    expect(snapped.getHours()).toBe(10);
    expect(snapped.getMinutes()).toBe(15);
  });
});

describe('snapDateTimeLocalToQuarterHour', () => {
  it('returns snapped datetime-local values', () => {
    expect(snapDateTimeLocalToQuarterHour('2026-05-07T10:07')).toBe('2026-05-07T10:15');
    expect(snapDateTimeLocalToQuarterHour('2026-05-07T10:00')).toBe('2026-05-07T10:00');
  });
});
