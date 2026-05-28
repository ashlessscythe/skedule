'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SESSION_MESSAGES: Record<string, string> = {
  email_changed:
    'Your email was updated. Sign in with your new email address on all devices.',
  password_changed:
    'Your password was updated. Sign in again with your new password.',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const reason = searchParams.get('reason');
  const sessionMessage = reason ? SESSION_MESSAGES[reason] : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: next,
      });

      if (!res?.ok) {
        setError('Invalid email or password.');
        return;
      }

      window.location.href = res.url ?? next;
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your staff credentials to access the dashboard.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {sessionMessage ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {sessionMessage}
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Password</span>
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/auth/forgot-password"
            className="text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Need access?{' '}
          <Link href="/auth/register" className="text-primary underline-offset-4 hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </form>
  );
}

