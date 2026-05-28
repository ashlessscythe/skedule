import { describe, expect, it } from 'vitest';
import {
  CHECKIN_WINDOW_MS,
  checkinOpensAt,
  getCheckinWindowState,
} from './checkin-window';

describe('checkin window', () => {
  const start = new Date('2026-06-15T14:00:00.000Z');
  const end = new Date('2026-06-15T15:00:00.000Z');

  it('opens 24 hours before start', () => {
    expect(checkinOpensAt(start).getTime()).toBe(start.getTime() - CHECKIN_WINDOW_MS);
  });

  it('is too early before the window opens', () => {
    expect(
      getCheckinWindowState({
        startTime: start,
        endTime: end,
        now: new Date('2026-06-14T13:59:59.000Z'),
      })
    ).toBe('too_early');
  });

  it('is open at window start and through end time', () => {
    expect(
      getCheckinWindowState({
        startTime: start,
        endTime: end,
        now: new Date('2026-06-14T14:00:00.000Z'),
      })
    ).toBe('open');
    expect(
      getCheckinWindowState({
        startTime: start,
        endTime: end,
        now: new Date('2026-06-15T14:30:00.000Z'),
      })
    ).toBe('open');
    expect(
      getCheckinWindowState({
        startTime: start,
        endTime: end,
        now: end,
      })
    ).toBe('open');
  });

  it('is closed after appointment end', () => {
    expect(
      getCheckinWindowState({
        startTime: start,
        endTime: end,
        now: new Date('2026-06-15T15:00:01.000Z'),
      })
    ).toBe('closed');
  });
});
