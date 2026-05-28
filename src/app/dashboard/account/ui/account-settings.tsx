'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/security/turnstile-widget';

type EmailStep = 'form' | 'verify' | 'done';

export function AccountSettings(props: { currentEmail: string; turnstileSiteKey: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            To change your display name, contact an administrator for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current email: <span className="font-medium text-foreground">{props.currentEmail}</span>
          </p>
        </CardContent>
      </Card>

      <ChangeEmailCard
        currentEmail={props.currentEmail}
        turnstileSiteKey={props.turnstileSiteKey}
      />
      <ChangePasswordCard />
    </div>
  );
}

function ChangeEmailCard(props: { currentEmail: string; turnstileSiteKey: string }) {
  const [step, setStep] = useState<EmailStep>('form');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/email/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          newEmail,
          currentPassword,
          turnstileToken,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        maskedEmail?: string;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? 'Unable to send verification code.');
        return;
      }
      setMaskedEmail(body?.maskedEmail ?? newEmail);
      setStep('verify');
      setInfo('Enter the 6-digit code we sent to your new email address.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/email/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newEmail, code }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        signOutRequired?: boolean;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? 'Unable to verify code.');
        return;
      }
      if (body?.signOutRequired) {
        const callbackUrl = new URL(
          '/auth/login?reason=email_changed',
          window.location.origin
        ).href;
        await signOut({ callbackUrl });
        return;
      }
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  const canRequest =
    Boolean(newEmail.trim()) &&
    Boolean(currentPassword) &&
    Boolean(turnstileToken) &&
    Boolean(props.turnstileSiteKey);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Change email</CardTitle>
        <CardDescription>
          We&apos;ll send a verification code to your new address before updating your account.
        </CardDescription>
      </CardHeader>

      {step === 'form' ? (
        <form onSubmit={requestCode}>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-current-password">Current password</Label>
              <Input
                id="email-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            {props.turnstileSiteKey ? (
              <TurnstileWidget siteKey={props.turnstileSiteKey} onToken={setTurnstileToken} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Turnstile is not configured. Set `TURNSTILE_SITE_KEY`.
              </p>
            )}
            {error ? <ErrorBanner message={error} /> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || !canRequest}>
              {loading ? 'Sending…' : 'Send verification code'}
            </Button>
          </CardFooter>
        </form>
      ) : null}

      {step === 'verify' ? (
        <form onSubmit={confirmCode}>
          <CardContent className="space-y-4">
            {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
            {maskedEmail ? (
              <p className="text-sm">
                Code sent to <span className="font-medium">{maskedEmail}</span>
              </p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="verify-code">Verification code</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            {error ? <ErrorBanner message={error} /> : null}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Confirm new email'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setStep('form');
                setError(null);
                setInfo(null);
              }}
            >
              Back
            </Button>
          </CardFooter>
        </form>
      ) : null}
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        signOutRequired?: boolean;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? 'Unable to update password.');
        return;
      }
      if (body?.signOutRequired) {
        const callbackUrl = new URL(
          '/auth/login?reason=password_changed',
          window.location.origin
        ).href;
        await signOut({ callbackUrl });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          You will be signed out on all devices after your password is updated.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="pw-current">Current password</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-new">New password</Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-confirm">Confirm new password</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error ? <ErrorBanner message={error} /> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}
