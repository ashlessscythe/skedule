'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CheckinCard({
  token,
  appointment,
}: {
  token: string;
  appointment: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
    location: { name: string; timeZone: string };
    client: { firstName: string; lastName: string; email: string | null };
    staff: { firstName: string; lastName: string } | null;
    type: { name: string; durationMinutes: number } | null;
  };
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
        setError(body?.error ?? 'Unable to check in.');
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
        <h1 className="text-xl font-semibold tracking-tight">Check-in</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.client.firstName} {appointment.client.lastName} — {appointment.location.name}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Service:</span>{' '}
          {appointment.type?.name ?? '—'}
        </div>
        <div>
          <span className="text-muted-foreground">Staff:</span>{' '}
          {appointment.staff ? `${appointment.staff.firstName} ${appointment.staff.lastName}` : 'Unassigned'}
        </div>
        <div>
          <span className="text-muted-foreground">Start (UTC):</span>{' '}
          <span className="font-mono text-xs">{appointment.startTime.toISOString()}</span>
        </div>
      </div>

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

