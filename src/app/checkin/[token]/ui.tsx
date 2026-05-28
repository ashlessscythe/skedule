'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatAppointmentWindowLocal } from '@/lib/email/format-appointment-local';
import { formatLocationAddress } from '@/lib/appointment-client-links';
import { CheckinActions } from './checkin-actions';

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

  const startUtc = new Date(appointment.startTimeIso);
  const endUtc = new Date(appointment.endTimeIso);
  const whenLocal = formatAppointmentWindowLocal({
    startUtc,
    endUtc,
    timeZone: appointment.location.timeZone,
  });
  const addressFormatted = formatLocationAddress(appointment.location);
  const staffName = appointment.staff
    ? `${appointment.staff.firstName} ${appointment.staff.lastName}`
    : null;

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
        } else if (/expired/i.test(msg)) {
          setError(
            'This check-in link has expired. Please check your email for a newer link or contact your scheduling office.'
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
      <div className="rounded-lg border bg-card p-6">
        <div className="text-sm font-medium">Checked in.</div>
        <div className="mt-1 text-sm text-muted-foreground">
          You can close this page.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Your appointment</h2>
        <p className="text-sm text-muted-foreground">
          {appointment.client.firstName} {appointment.client.lastName} — {appointment.tenantName}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">When:</span>{' '}
          <span className="font-medium">{whenLocal}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Where:</span>{' '}
          <span className="font-medium">{appointment.location.name}</span>
          {addressFormatted ? (
            <div className="mt-0.5 text-muted-foreground">{addressFormatted}</div>
          ) : null}
        </div>
        <div>
          <span className="text-muted-foreground">Service:</span>{' '}
          {appointment.type?.name ?? '—'}
        </div>
        <div>
          <span className="text-muted-foreground">Staff:</span>{' '}
          {staffName ?? 'Unassigned'}
        </div>
      </div>

      <CheckinActions
        appointmentId={appointment.id}
        tenantName={appointment.tenantName}
        serviceName={appointment.type?.name ?? null}
        staffName={staffName}
        location={appointment.location}
        startTimeIso={appointment.startTimeIso}
        endTimeIso={appointment.endTimeIso}
      />

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
    </div>
  );
}
