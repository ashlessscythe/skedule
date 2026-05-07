'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BrandingShape = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  updatedAt: string | Date | null;
};

function asInputValue(v: string | null | undefined) {
  return v ?? '';
}

export function BrandingForm(props: { initialBranding: BrandingShape | null }) {
  const initial = useMemo(
    () =>
      ({
        logoUrl: props.initialBranding?.logoUrl ?? null,
        primaryColor: props.initialBranding?.primaryColor ?? null,
        secondaryColor: props.initialBranding?.secondaryColor ?? null,
        accentColor: props.initialBranding?.accentColor ?? null,
        emailFromName: props.initialBranding?.emailFromName ?? null,
        emailFromAddress: props.initialBranding?.emailFromAddress ?? null,
        updatedAt: props.initialBranding?.updatedAt ?? null,
      }) satisfies BrandingShape,
    [props.initialBranding]
  );

  const [logoUrl, setLogoUrl] = useState(asInputValue(initial.logoUrl));
  const [primaryColor, setPrimaryColor] = useState(asInputValue(initial.primaryColor));
  const [secondaryColor, setSecondaryColor] = useState(asInputValue(initial.secondaryColor));
  const [accentColor, setAccentColor] = useState(asInputValue(initial.accentColor));
  const [emailFromName, setEmailFromName] = useState(asInputValue(initial.emailFromName));
  const [emailFromAddress, setEmailFromAddress] = useState(asInputValue(initial.emailFromAddress));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          logoUrl,
          primaryColor,
          secondaryColor,
          accentColor,
          emailFromName,
          emailFromAddress,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to save branding.');
        return;
      }
      setSaved(true);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="primaryColor">Primary color</Label>
          <Input
            id="primaryColor"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#0ea5e9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="accentColor">Accent color</Label>
          <Input
            id="accentColor"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            placeholder="#a855f7"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="secondaryColor">Secondary color</Label>
          <Input
            id="secondaryColor"
            value={secondaryColor}
            onChange={(e) => setSecondaryColor(e.target.value)}
            placeholder="#64748b"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="emailFromName">Email from name</Label>
          <Input
            id="emailFromName"
            value={emailFromName}
            onChange={(e) => setEmailFromName(e.target.value)}
            placeholder="Skedule"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emailFromAddress">Email from address</Label>
          <Input
            id="emailFromAddress"
            value={emailFromAddress}
            onChange={(e) => setEmailFromAddress(e.target.value)}
            placeholder="no-reply@example.com"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : saved ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Saved.
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

