'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const [email, setEmail] = useState('admin@acmehealth.test');
  const [password, setPassword] = useState('Admin123!');
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
      </div>
    </form>
  );
}

