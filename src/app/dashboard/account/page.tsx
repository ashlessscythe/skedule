import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AccountSettings } from './ui/account-settings';

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.error === 'SessionExpired') redirect('/auth/login');

  const email = session.user?.email ?? '';
  if (!email) redirect('/auth/login');

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim() ?? '';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sign-in email and password.
        </p>
      </div>

      <AccountSettings currentEmail={email} turnstileSiteKey={turnstileSiteKey} />
    </div>
  );
}
