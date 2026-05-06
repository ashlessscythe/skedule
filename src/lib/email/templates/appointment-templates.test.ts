import { describe, expect, it } from 'vitest';
import { renderAppointmentConfirmationEmail } from './appointment-confirmation';
import { renderAppointmentUpdatedEmail } from './appointment-updated';
import { renderAppointmentCancelledEmail } from './appointment-cancelled';
import { renderAppointmentReminderEmail } from './appointment-reminder';

const base = {
  tenantName: 'Acme Clinic',
  clientName: 'Jamie Doe',
  startTimeLocal: 'Monday, Jun 16, 2025 at 10:00 AM – 10:30 AM EDT',
  locationName: 'Downtown',
};

describe('renderAppointmentConfirmationEmail', () => {
  it('includes tenant, client, when, where', () => {
    const { subject, html } = renderAppointmentConfirmationEmail(base);
    expect(subject).toContain('Acme Clinic');
    expect(html).toContain('Jamie Doe');
    expect(html).toContain('Downtown');
    expect(html).toContain('Appointment confirmed');
  });

  it('includes series note when seriesExtraCount > 0', () => {
    const { html } = renderAppointmentConfirmationEmail({
      ...base,
      seriesExtraCount: 3,
    });
    expect(html).toContain('3');
    expect(html).toMatch(/more occurrence/i);
  });

  it('escapes HTML in user-controlled strings', () => {
    const { html } = renderAppointmentConfirmationEmail({
      ...base,
      clientName: 'Evil <script>',
      tenantName: 'T & Co <b>',
      locationName: 'Here "there"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('includes manage link when manageUrl set', () => {
    const { html } = renderAppointmentConfirmationEmail({
      ...base,
      manageUrl: 'https://example.com/a/1',
    });
    expect(html).toContain('https://example.com/a/1');
  });
});

describe('renderAppointmentUpdatedEmail', () => {
  it('marks update in subject and body', () => {
    const { subject, html } = renderAppointmentUpdatedEmail(base);
    expect(subject).toMatch(/updated/i);
    expect(html).toMatch(/updated/i);
    expect(html).toContain('Acme Clinic');
  });
});

describe('renderAppointmentCancelledEmail', () => {
  it('marks cancellation', () => {
    const { subject, html } = renderAppointmentCancelledEmail(base);
    expect(subject).toMatch(/cancelled/i);
    expect(html).toMatch(/cancelled/i);
  });
});

describe('renderAppointmentReminderEmail', () => {
  it('marks reminder', () => {
    const { subject, html } = renderAppointmentReminderEmail(base);
    expect(subject).toMatch(/reminder/i);
    expect(html).toMatch(/reminder/i);
  });
});
