import { describe, expect, it } from 'vitest';
import { formatAppointmentWindowLocal } from './format-appointment-local';

describe('formatAppointmentWindowLocal', () => {
  it('formats start and end in the given IANA timezone', () => {
    const startUtc = new Date('2025-06-15T14:00:00.000Z');
    const endUtc = new Date('2025-06-15T14:30:00.000Z');
    const s = formatAppointmentWindowLocal({
      startUtc,
      endUtc,
      timeZone: 'America/New_York',
    });
    expect(s).toContain('2025');
    expect(s).toContain('–');
    expect(s.length).toBeGreaterThan(20);
  });

  it('differs for UTC vs New York for the same instants', () => {
    const startUtc = new Date('2025-06-15T14:00:00.000Z');
    const endUtc = new Date('2025-06-15T15:00:00.000Z');
    const utcLine = formatAppointmentWindowLocal({
      startUtc,
      endUtc,
      timeZone: 'UTC',
    });
    const nyLine = formatAppointmentWindowLocal({
      startUtc,
      endUtc,
      timeZone: 'America/New_York',
    });
    expect(utcLine).not.toBe(nyLine);
  });
});
