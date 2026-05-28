'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckinAppointmentPanel } from './checkin-appointment-panel';

export type CheckinAppointmentProps = {
  id: string;
  startTimeIso: string;
  endTimeIso: string;
  status: string;
  tenantName: string;
  location: {
    name: string;
    timeZone: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  client: { firstName: string; lastName: string; email: string | null };
  staff: { firstName: string; lastName: string } | null;
  type: { name: string; durationMinutes: number } | null;
};

export function CheckinCard({
  token,
  appointment,
}: {
  token: string;
  appointment: CheckinAppointmentProps;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCheckin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${token}`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg = body?.error ?? 'Unable to check in.';
        if (/already checked in/i.test(msg)) {
          setError('You have already checked in for this appointment.');
        } else if (/too early/i.test(msg)) {
          setError(msg);
        } else if (/expired/i.test(msg) || /no longer available/i.test(msg)) {
          setError(
            'Check-in is no longer available for this appointment. Please contact your scheduling office.'
          );
        } else if (/cancelled/i.test(msg)) {
          setError('This appointment was cancelled.');
        } else {
          setError(msg);
        }
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium">Checked in.</div>
          <div className="mt-1 text-sm text-muted-foreground">
            You&apos;re all set — we&apos;ve recorded your arrival.
          </div>
        </div>
        <CheckinAppointmentPanel appointment={appointment} />
      </div>
    );
  }

  return (
    <CheckinAppointmentPanel appointment={appointment}>
      {error ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-6">
        <Button onClick={onCheckin} disabled={loading} className="w-full">
          {loading ? 'Checking in…' : 'Check in'}
        </Button>
      </div>
    </CheckinAppointmentPanel>
  );
}
