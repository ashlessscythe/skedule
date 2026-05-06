import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  apptEmailInclude,
  sendAppointmentReminderEmailForClient,
} from '@/lib/email/appointment-emails';

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const header = bearer ?? req.headers.get('x-cron-secret')?.trim();
  return Boolean(header && header === secret);
}

/**
 * Send reminder emails for SCHEDULED appointments whose start time falls in a window
 * around `REMINDER_HOURS_BEFORE` (default 24) from now. Idempotent via `reminderSentAt`.
 *
 * Schedule externally (e.g. Vercel Cron) with header:
 *   `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
 */
async function runReminders() {
  const hours = parseFloat(process.env.REMINDER_HOURS_BEFORE ?? '24');
  if (!Number.isFinite(hours) || hours <= 0) {
    return NextResponse.json({ error: 'Invalid REMINDER_HOURS_BEFORE' }, { status: 500 });
  }

  const ms = hours * 3600 * 1000;
  const slackMs = 30 * 60 * 1000;
  const lower = new Date(Date.now() + ms - slackMs);
  const upper = new Date(Date.now() + ms + slackMs);

  const candidates = await prisma.appointment.findMany({
    where: {
      deletedAt: null,
      status: 'SCHEDULED',
      reminderSentAt: null,
      startTime: { gte: lower, lte: upper },
    },
    include: apptEmailInclude,
    take: 100,
    orderBy: { startTime: 'asc' },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const appt of candidates) {
    if (!appt.client.email?.trim()) {
      skipped++;
      continue;
    }
    try {
      const ok = await sendAppointmentReminderEmailForClient(appt);
      if (!ok) {
        skipped++;
        continue;
      }
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${appt.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    window: { lower: lower.toISOString(), upper: upper.toISOString() },
    examined: candidates.length,
    sent,
    skipped,
    errors,
  });
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReminders();
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runReminders();
}
