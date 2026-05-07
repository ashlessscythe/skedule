import { describe, expect, it, vi } from 'vitest';
import { EmailNotificationService } from './email-notifier';
import { sendEmail } from './resend';

vi.mock('./resend', () => ({
  sendEmail: vi.fn(async () => ({ skipped: false, id: 'e1' })),
}));

describe('EmailNotificationService', () => {
  it('throws if subject/html missing', async () => {
    const svc = new EmailNotificationService();
    // @ts-expect-error testing runtime guard
    await expect(svc.send({ to: 'a@b.com' })).rejects.toThrow(/require subject and html/i);
  });

  it('delegates to sendEmail', async () => {
    const svc = new EmailNotificationService();
    const res = await svc.send({ to: 'a@b.com', subject: 's', html: '<p/>' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ skipped: false, id: 'e1' });
  });
});

