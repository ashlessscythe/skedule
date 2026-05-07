'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Tenant = { id: string; name: string; slug: string };

export function TenantSwitcher() {
  const [loading, setLoading] = useState(true);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => tenants, [tenants]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tenant/active', { method: 'GET' });
        if (!res.ok) return;
        const body = (await res.json()) as { activeTenantId: string | null; tenants: Tenant[] };
        if (cancelled) return;
        setActiveTenantId(body.activeTenantId);
        setTenants(body.tenants ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (options.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeTenantId ?? undefined}
        onValueChange={(v) => {
          setActiveTenantId(v);
          startTransition(async () => {
            await fetch('/api/tenant/switch', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ tenantId: v }),
            });
            window.location.reload();
          });
        }}
      >
        <SelectTrigger className="h-8 w-[220px]" disabled={isPending}>
          <SelectValue placeholder="Select tenant" />
        </SelectTrigger>
        <SelectContent>
          {options.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          setActiveTenantId(null);
          startTransition(async () => {
            await fetch('/api/tenant/switch', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ tenantId: null }),
            });
            window.location.reload();
          });
        }}
      >
        Reset
      </Button>
    </div>
  );
}

