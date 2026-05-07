'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          password,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Unable to register.');
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Request access</CardTitle>
        <CardDescription>
          Create an account. An admin will approve your access before you can sign in.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Thanks — your registration was received.</p>
            <p className="text-muted-foreground">We’ll email you when an admin approves your access.</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        )}
      </CardContent>

      {!success ? (
        <CardFooter className="justify-center">
          <span className="text-xs text-muted-foreground">
            Already have access?{' '}
            <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}

