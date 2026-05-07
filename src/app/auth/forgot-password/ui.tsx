'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/security/turnstile-widget';

export function ForgotPasswordForm(props: { turnstileSiteKey: string }) {
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to request a reset.');
        return;
      }

      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = Boolean(email.trim()) && Boolean(turnstileToken) && Boolean(props.turnstileSiteKey);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We’ll email you a link to set a new password.</CardDescription>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">If that email exists, we sent a reset link.</p>
            <p className="text-muted-foreground">Check your inbox (and spam folder) for the message.</p>
            <p className="pt-2">
              <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {props.turnstileSiteKey ? (
              <TurnstileWidget
                siteKey={props.turnstileSiteKey}
                onToken={setTurnstileToken}
                className="rounded-md border bg-background p-3"
              />
            ) : (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Turnstile is not configured. Set `TURNSTILE_SITE_KEY`.
              </div>
            )}

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
              {loading ? 'Sending…' : 'Email reset link'}
            </Button>
          </form>
        )}
      </CardContent>

      {!success ? (
        <CardFooter className="justify-center">
          <span className="text-xs text-muted-foreground">
            Remembered it?{' '}
            <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}

