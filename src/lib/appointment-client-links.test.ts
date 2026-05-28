import { describe, expect, it } from 'vitest';
import {
  buildIcsCalendarFile,
  formatLocationAddress,
  googleCalendarAddUrl,
  googleMapsUrlForLocation,
} from './appointment-client-links';

describe('formatLocationAddress', () => {
  it('joins address parts', () => {
    expect(
      formatLocationAddress({
        name: 'Main',
        addressLine1: '123 Main St',
        city: 'Boston',
        state: 'MA',
        postalCode: '02101',
        country: 'US',
      })
    ).toBe('123 Main St, Boston, MA, 02101, US');
  });

  it('returns null when no address fields', () => {
    expect(formatLocationAddress({ name: 'Main' })).toBeNull();
  });
});

describe('googleMapsUrlForLocation', () => {
  it('uses formatted address when present', () => {
    const url = googleMapsUrlForLocation({
      name: 'Clinic',
      addressLine1: '1 Health Way',
      city: 'Austin',
      state: 'TX',
    });
    expect(url).toContain('google.com/maps');
    expect(url).toContain(encodeURIComponent('1 Health Way'));
  });
});

describe('googleCalendarAddUrl', () => {
  it('includes title and UTC date range', () => {
    const url = googleCalendarAddUrl({
      title: 'Visit',
      startUtc: new Date('2026-06-01T14:00:00.000Z'),
      endUtc: new Date('2026-06-01T14:30:00.000Z'),
      location: '123 Main St',
    });
    expect(url).toContain('calendar.google.com');
    expect(url).toContain('Visit');
    expect(url).toContain('20260601T140000Z');
  });
});

describe('buildIcsCalendarFile', () => {
  it('emits a valid VEVENT block', () => {
    const ics = buildIcsCalendarFile({
      uid: 'appt-1@skedule',
      title: 'Appointment',
      startUtc: new Date('2026-06-01T14:00:00.000Z'),
      endUtc: new Date('2026-06-01T14:30:00.000Z'),
      location: 'Clinic',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Appointment');
    expect(ics).toContain('LOCATION:Clinic');
    expect(ics).toContain('END:VEVENT');
  });
});
