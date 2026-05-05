import type { ReactNode } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserMenu } from '@/app/dashboard/user-menu';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold">
              Skedule
            </Link>
            <nav className="hidden items-center gap-3 text-sm text-muted-foreground sm:flex">
              <Link href="/dashboard" className="hover:text-foreground">
                Overview
              </Link>
              <span className="text-muted-foreground/40">|</span>
              <Link href="/dashboard/appointments" className="hover:text-foreground">
                Appointments
              </Link>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-muted-foreground">Clients</span>
            </nav>
          </div>

          <UserMenu email={session.user?.email ?? ''} />
        </div>
      </div>

      <main>{children}</main>
    </div>
  );
}

