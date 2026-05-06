'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function AvailabilityRowActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm('Delete this availability rule?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/availability/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to delete.');
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={onDelete} disabled={loading}>
        {loading ? 'Deleting…' : 'Delete'}
      </Button>
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

