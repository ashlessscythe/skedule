import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendReminderMock = vi.fn(async () => true);
vi.mock('@/lib/email/appointment-emails', () => ({
  apptEmailInclude: {},
  sendAppointmentReminderEmailForClient: (...args: unknown[]) => sendReminderMock(...args),
}));

const prismaMock = {
  appointment: {
    findMany: vi.fn(async () => []),
    update: vi.fn(async () => ({})),
  },
};
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('/api/cron/appointment-reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'secret';
    process.env.REMINDER_HOURS_BEFORE = '24';
  });

  it('rejects when unauthorized', async () => {
    const { GET } = await import('./route');
    const res = await GET(new Request('http://test', { method: 'GET' }));
    expect(res.status).toBe(401);
  });

  it('authorizes via Bearer and selects window; updates reminderSentAt on send ok', async () => {
    prismaMock.appointment.findMany.mockResolvedValueOnce([
      {
        id: 'a1',
        startTime: new Date('2026-01-02T00:00:00.000Z'),
        client: { email: 'a@example.com' },
      },
      {
        id: 'a2',
        startTime: new Date('2026-01-02T00:10:00.000Z'),
        client: { email: '' },
      },
      {
        id: 'a3',
        startTime: new Date('2026-01-02T00:20:00.000Z'),
        client: { email: 'b@example.com' },
      },
    ]);

    sendReminderMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://test', {
        method: 'POST',
        headers: { authorization: 'Bearer secret' },
      })
    );
    expect(res.status).toBe(200);

    expect(prismaMock.appointment.findMany).toHaveBeenCalledTimes(1);
    const call0 = prismaMock.appointment.findMany.mock.calls[0]?.[0] as
      | { where: unknown }
      | undefined;
    const where = call0?.where as {
      status: unknown;
      reminderSentAt: unknown;
      startTime: { gte: unknown; lte: unknown };
    };
    expect(where.status).toBe('SCHEDULED');
    expect(where.reminderSentAt).toBeNull();
    expect(where.startTime.gte).toBeInstanceOf(Date);
    expect(where.startTime.lte).toBeInstanceOf(Date);

    expect(sendReminderMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.appointment.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { reminderSentAt: expect.any(Date) },
      })
    );

    const body = await res.json();
    expect(body.examined).toBe(3);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(2);
    expect(body.window.lower).toMatch(/Z$/);
    expect(body.window.upper).toMatch(/Z$/);
  });

  it('authorizes via x-cron-secret header too', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      new Request('http://test', {
        method: 'GET',
        headers: { 'x-cron-secret': 'secret' },
      })
    );
    expect(res.status).toBe(200);
  });
});

