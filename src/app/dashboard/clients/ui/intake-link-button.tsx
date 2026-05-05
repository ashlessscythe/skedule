'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function IntakeLinkButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intake-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to generate intake link.');
        return;
      }
      const body = (await res.json()) as { url: string };
      setUrl(body.url);
      await navigator.clipboard.writeText(body.url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={onGenerate} disabled={loading}>
        {loading ? 'Generating…' : 'Intake link'}
      </Button>
      {url ? <div className="text-xs text-muted-foreground">Copied: {url}</div> : null}
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

