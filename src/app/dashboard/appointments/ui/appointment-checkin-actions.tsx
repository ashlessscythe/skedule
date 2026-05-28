'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type QrTokenResponse = {
  url: string;
  pdfUrl: string;
};

function checkinActionsDisabled(status: string, endTimeIso: string): boolean {
  if (['CANCELLED', 'NO_SHOW', 'COMPLETED', 'CHECKED_IN'].includes(status)) return true;
  return new Date(endTimeIso).getTime() < Date.now();
}

export function AppointmentCheckinActions({
  appointmentId,
  status,
  endTime,
}: {
  appointmentId: string;
  status: string;
  endTime: string;
}) {
  const [loading, setLoading] = useState<'link' | 'pdf' | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disabled = checkinActionsDisabled(status, endTime);

  async function fetchToken(): Promise<QrTokenResponse | null> {
    const res = await fetch('/api/qr-tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appointmentId, rotate: false }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Unable to get check-in link.');
      return null;
    }
    return (await res.json()) as QrTokenResponse;
  }

  async function onCopyLink() {
    setLoading('link');
    setError(null);
    try {
      const body = await fetchToken();
      if (!body) return;
      setUrl(body.url);
      await navigator.clipboard.writeText(body.url);
    } finally {
      setLoading(null);
    }
  }

  async function onDownloadCard() {
    setLoading('pdf');
    setError(null);
    try {
      const body = await fetchToken();
      if (!body) return;
      window.open(body.pdfUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(null);
    }
  }

  if (disabled) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex flex-wrap justify-end gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={onCopyLink}
          disabled={loading !== null}
        >
          {loading === 'link' ? 'Copying…' : 'Check-in link'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDownloadCard}
          disabled={loading !== null}
        >
          {loading === 'pdf' ? 'Opening…' : 'Download card'}
        </Button>
      </div>
      {url ? <div className="max-w-[220px] truncate text-xs text-muted-foreground">Copied: {url}</div> : null}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}
