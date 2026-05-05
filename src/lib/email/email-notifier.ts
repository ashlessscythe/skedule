import type { NotificationService, NotificationMessage } from '@/lib/email/notifier';
import { sendEmail } from '@/lib/email/resend';

export class EmailNotificationService implements NotificationService {
  channel = 'email' as const;

  async send(message: NotificationMessage) {
    if (!message.subject || !message.html) {
      throw new Error('Email notifications require subject and html');
    }
    return await sendEmail({
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }
}

