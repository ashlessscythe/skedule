import { describe, expect, it, vi, beforeEach } from 'vitest';

const sendMock = vi.fn(async () => ({ data: { id: 'email-1' } }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
    constructor(apiKey: string) {
      void apiKey;
    }
  },
}));

describe('sendEmail', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('returns skipped when SEND_EMAIL is not true', async () => {
    const prev = process.env.SEND_EMAIL;
    process.env.SEND_EMAIL = 'false';

    const { sendEmail } = await import('./resend');
    const res = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p/>' });
    expect(res.skipped).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();

    process.env.SEND_EMAIL = prev;
  });

  it('throws when enabled but missing RESEND_API_KEY', async () => {
    const prevSend = process.env.SEND_EMAIL;
    const prevKey = process.env.RESEND_API_KEY;
    const prevFrom = process.env.EMAIL_FROM_DEFAULT;
    process.env.SEND_EMAIL = 'true';
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM_DEFAULT = 'Test <no-reply@test>';

    const { sendEmail } = await import('./resend');
    await expect(sendEmail({ to: 'a@b.com', subject: 's', html: '<p/>' })).rejects.toThrow(
      /Missing RESEND_API_KEY/
    );

    process.env.SEND_EMAIL = prevSend;
    process.env.RESEND_API_KEY = prevKey;
    process.env.EMAIL_FROM_DEFAULT = prevFrom;
  });

  it('sends via Resend when enabled and configured', async () => {
    const prevSend = process.env.SEND_EMAIL;
    const prevKey = process.env.RESEND_API_KEY;
    const prevFrom = process.env.EMAIL_FROM_DEFAULT;
    process.env.SEND_EMAIL = 'true';
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM_DEFAULT = 'Test <no-reply@test>';

    const { sendEmail } = await import('./resend');
    const res = await sendEmail({ to: 'a@b.com', subject: 'hello', html: '<p>hi</p>' });
    expect(res.skipped).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]![0]).toMatchObject({
      from: 'Test <no-reply@test>',
      to: 'a@b.com',
      subject: 'hello',
    });

    process.env.SEND_EMAIL = prevSend;
    process.env.RESEND_API_KEY = prevKey;
    process.env.EMAIL_FROM_DEFAULT = prevFrom;
  });

  it('throws when Resend returns an error and no fallback is possible', async () => {
    const prevSend = process.env.SEND_EMAIL;
    const prevKey = process.env.RESEND_API_KEY;
    const prevFrom = process.env.EMAIL_FROM_DEFAULT;
    process.env.SEND_EMAIL = 'true';
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM_DEFAULT = 'Test <no-reply@test>';

    sendMock.mockResolvedValueOnce({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 },
    } as unknown as { data: { id: string } });

    const { sendEmail } = await import('./resend');
    await expect(
      sendEmail({ to: 'a@b.com', subject: 's', html: '<p/>' })
    ).rejects.toThrow(/Resend send failed.*Too many requests/);
    expect(sendMock).toHaveBeenCalledTimes(1);

    process.env.SEND_EMAIL = prevSend;
    process.env.RESEND_API_KEY = prevKey;
    process.env.EMAIL_FROM_DEFAULT = prevFrom;
  });

  it('falls back to EMAIL_FROM_DEFAULT when Resend rejects a tenant from address', async () => {
    const prevSend = process.env.SEND_EMAIL;
    const prevKey = process.env.RESEND_API_KEY;
    const prevFrom = process.env.EMAIL_FROM_DEFAULT;
    process.env.SEND_EMAIL = 'true';
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM_DEFAULT = 'Default <noreply@verified.example>';

    sendMock.mockResolvedValueOnce({
      data: null,
      error: {
        name: 'validation_error',
        message: 'The from domain must be verified',
        statusCode: 422,
      },
    } as unknown as { data: { id: string } });
    sendMock.mockResolvedValueOnce({ data: { id: 'email-fallback' } });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendEmail } = await import('./resend');
    const res = await sendEmail({
      to: 'a@b.com',
      subject: 's',
      html: '<p/>',
      from: 'Tenant <no-reply@acmehealth.test>',
    });

    expect(res.skipped).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]![0]).toMatchObject({
      from: 'Tenant <no-reply@acmehealth.test>',
    });
    expect(sendMock.mock.calls[1]![0]).toMatchObject({
      from: 'Default <noreply@verified.example>',
    });

    warnSpy.mockRestore();
    process.env.SEND_EMAIL = prevSend;
    process.env.RESEND_API_KEY = prevKey;
    process.env.EMAIL_FROM_DEFAULT = prevFrom;
  });
});

