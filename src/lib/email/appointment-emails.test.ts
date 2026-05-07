import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AppointmentEmailInclude } from './appointment-emails';
import {
  sendAppointmentBookedEmail,
  sendAppointmentCancelledEmailForClient,
  sendAppointmentReminderEmailForClient,
  sendAppointmentUpdatedEmailForClient,
} from './appointment-emails';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/resend';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: {
      findFirst: vi.fn(),
    },
    branding: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn(),
}));

function mockAppt(overrides: Partial<AppointmentEmailInclude> = {}): AppointmentEmailInclude {
  return {
    id: 'appt-1',
    tenantId: 't1',
    locationId: 'l1',
    clientId: 'c1',
    staffId: null,
    typeId: null,
    startTime: new Date('2025-06-15T14:00:00.000Z'),
    endTime: new Date('2025-06-15T14:30:00.000Z'),
    status: 'SCHEDULED',
    notes: null,
    recurrenceRuleId: null,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    tenant: { name: 'Clinic' },
    location: { name: 'Main St', timeZone: 'America/New_York' },
    client: { firstName: 'Pat', lastName: 'Kim', email: 'pat@example.com' },
    ...overrides,
  };
}

describe('sendAppointmentBookedEmail', () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockReset();
    vi.mocked(prisma.appointment.findFirst).mockReset();
    vi.mocked(prisma.branding.findUnique).mockReset();
  });

  it('does not call sendEmail when appointment is missing', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
    await sendAppointmentBookedEmail({ appointmentId: 'missing' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not call sendEmail when client has no email', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(
      mockAppt({ client: { firstName: 'A', lastName: 'B', email: null } })
    );
    await sendAppointmentBookedEmail({ appointmentId: 'appt-1' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends confirmation with series note when seriesExtraCount provided', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppt());
    vi.mocked(prisma.branding.findUnique).mockResolvedValue(null);
    vi.mocked(sendEmail).mockResolvedValue({ skipped: false, id: 'e-1' });

    await sendAppointmentBookedEmail({ appointmentId: 'appt-1', seriesExtraCount: 2 });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.to).toBe('pat@example.com');
    expect(call.subject).toContain('Clinic');
    expect(call.html).toContain('2');
    expect(call.html).toMatch(/more occurrence/i);
  });

  it('uses tenant email from when configured', async () => {
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(mockAppt());
    vi.mocked(prisma.branding.findUnique).mockResolvedValue({
      emailFromName: 'Clinic Team',
      emailFromAddress: 'no-reply@clinic.test',
    } as { emailFromName: string; emailFromAddress: string });
    vi.mocked(sendEmail).mockResolvedValue({ skipped: false, id: 'e-1' });

    await sendAppointmentBookedEmail({ appointmentId: 'appt-1' });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(call.from).toBe('Clinic Team <no-reply@clinic.test>');
  });
});

describe('sendAppointmentUpdatedEmailForClient', () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockReset();
    vi.mocked(prisma.branding.findUnique).mockReset();
  });

  it('skips when no client email', async () => {
    await sendAppointmentUpdatedEmailForClient(
      mockAppt({ client: { firstName: 'A', lastName: 'B', email: null } })
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends update email', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ skipped: false, id: 'e-2' });
    await sendAppointmentUpdatedEmailForClient(mockAppt());
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail).mock.calls[0]![0].subject).toMatch(/updated/i);
  });
});

describe('sendAppointmentCancelledEmailForClient', () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockReset();
    vi.mocked(prisma.branding.findUnique).mockReset();
  });

  it('sends cancellation email', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ skipped: false, id: 'e-3' });
    await sendAppointmentCancelledEmailForClient(mockAppt());
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail).mock.calls[0]![0].subject).toMatch(/cancelled/i);
  });
});

describe('sendAppointmentReminderEmailForClient', () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockReset();
    vi.mocked(prisma.branding.findUnique).mockReset();
  });

  it('returns false when send is skipped', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.mocked(sendEmail).mockResolvedValue({ skipped: true, reason: 'SEND_EMAIL is not true' });
    const ok = await sendAppointmentReminderEmailForClient(mockAppt());
    expect(ok).toBe(false);
    log.mockRestore();
  });

  it('returns true when send succeeds', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ skipped: false, id: 'e-4' });
    const ok = await sendAppointmentReminderEmailForClient(mockAppt());
    expect(ok).toBe(true);
  });

  it('returns false when no email', async () => {
    const ok = await sendAppointmentReminderEmailForClient(
      mockAppt({ client: { firstName: 'A', lastName: 'B', email: '' } })
    );
    expect(ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
