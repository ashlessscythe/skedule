import { describe, expect, it } from 'vitest';
import {
  MAX_RECURRENCE_SERIES_INSTANCES,
  expandRecurrenceExtraStartTimes,
  toRRuleString,
} from './recurrence';

describe('toRRuleString', () => {
  it('builds RRULE with FREQ, INTERVAL, COUNT', () => {
    const line = toRRuleString({ frequency: 'WEEKLY', interval: 2, count: 4 });
    expect(line).toMatch(/^RRULE:/);
    expect(line).toContain('FREQ=WEEKLY');
    expect(line).toContain('INTERVAL=2');
    expect(line).toContain('COUNT=4');
  });

  it('includes UNTIL when provided', () => {
    const until = new Date(Date.UTC(2025, 5, 1, 0, 0, 0));
    const line = toRRuleString({ frequency: 'DAILY', interval: 1, until });
    expect(line).toContain('UNTIL=20250601T000000Z');
  });
});

describe('expandRecurrenceExtraStartTimes', () => {
  /** Monday 2025-01-06 15:00 UTC */
  const dtStart = new Date(Date.UTC(2025, 0, 6, 15, 0, 0));

  it('returns count - 1 start times for WEEKLY with COUNT', () => {
    const extras = expandRecurrenceExtraStartTimes({
      recurrence: { frequency: 'WEEKLY', interval: 1, count: 4 },
      dtStartUtc: dtStart,
    });
    expect(extras).toHaveLength(3);
    expect(extras[0]).toEqual(new Date(Date.UTC(2025, 0, 13, 15, 0, 0)));
    expect(extras[1]).toEqual(new Date(Date.UTC(2025, 0, 20, 15, 0, 0)));
    expect(extras[2]).toEqual(new Date(Date.UTC(2025, 0, 27, 15, 0, 0)));
  });

  it('returns count - 1 for DAILY', () => {
    const extras = expandRecurrenceExtraStartTimes({
      recurrence: { frequency: 'DAILY', interval: 1, count: 3 },
      dtStartUtc: dtStart,
    });
    expect(extras).toHaveLength(2);
    expect(extras[0]).toEqual(new Date(Date.UTC(2025, 0, 7, 15, 0, 0)));
  });

  it('respects WEEKLY interval > 1', () => {
    const extras = expandRecurrenceExtraStartTimes({
      recurrence: { frequency: 'WEEKLY', interval: 2, count: 3 },
      dtStartUtc: dtStart,
    });
    expect(extras).toHaveLength(2);
    expect(extras[0]).toEqual(new Date(Date.UTC(2025, 0, 20, 15, 0, 0)));
    expect(extras[1]).toEqual(new Date(Date.UTC(2025, 1, 3, 15, 0, 0)));
  });

  it('throws when neither count nor until', () => {
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: { frequency: 'DAILY', interval: 1 },
        dtStartUtc: dtStart,
      })
    ).toThrow(/either count or until/i);
  });

  it('throws when both count and until', () => {
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: {
          frequency: 'DAILY',
          interval: 1,
          count: 5,
          until: new Date(Date.UTC(2025, 1, 1)),
        },
        dtStartUtc: dtStart,
      })
    ).toThrow(/not both/i);
  });

  it('throws when count < 2', () => {
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: { frequency: 'DAILY', count: 1 },
        dtStartUtc: dtStart,
      })
    ).toThrow(/at least 2/i);
  });

  it('throws when count exceeds cap', () => {
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: { frequency: 'DAILY', count: MAX_RECURRENCE_SERIES_INSTANCES + 1 },
        dtStartUtc: dtStart,
      })
    ).toThrow(/cannot exceed/i);
  });

  it('throws when until is not after start', () => {
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: { frequency: 'DAILY', until: dtStart },
        dtStartUtc: dtStart,
      })
    ).toThrow(/after the start/i);
  });

  it('returns extras for UNTIL-bound DAILY rule', () => {
    const until = new Date(Date.UTC(2025, 0, 8, 23, 0, 0));
    const extras = expandRecurrenceExtraStartTimes({
      recurrence: { frequency: 'DAILY', interval: 1, until },
      dtStartUtc: dtStart,
    });
    expect(extras).toHaveLength(2);
    expect(extras[0]).toEqual(new Date(Date.UTC(2025, 0, 7, 15, 0, 0)));
    expect(extras[1]).toEqual(new Date(Date.UTC(2025, 0, 8, 15, 0, 0)));
  });

  it('throws when expansion exceeds max instances (until too wide)', () => {
    const until = new Date(Date.UTC(2027, 0, 1, 0, 0, 0));
    expect(() =>
      expandRecurrenceExtraStartTimes({
        recurrence: { frequency: 'DAILY', interval: 1, until },
        dtStartUtc: dtStart,
      })
    ).toThrow(/exceeds 366/);
  });
});
