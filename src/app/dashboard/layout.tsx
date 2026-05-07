import type { CSSProperties, ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { TenantSwitcher } from '@/app/dashboard/ui/tenant-switcher';
import { DashboardMobileNav } from '@/app/dashboard/ui/dashboard-mobile-nav';
import { buildDashboardNav } from '@/app/dashboard/nav-config';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  const roleForTenant = session.roles.find((r) => r.tenantId === session.primaryTenantId)?.role;
  const isAdmin = roleForTenant === 'ADMIN';
  const isStaffOrAdmin = roleForTenant === 'STAFF' || isAdmin;

  const activeTenant = await prisma.tenant.findUnique({
    where: { id: session.primaryTenantId },
    select: {
      name: true,
      branding: { select: { logoUrl: true, primaryColor: true } },
    },
  });
  const tenantLogoUrl = activeTenant?.branding?.logoUrl?.trim() || null;
  const tenantPrimary = activeTenant?.branding?.primaryColor?.trim() || null;

  const { mainItems, admin } = buildDashboardNav({ isStaffOrAdmin, isAdmin });

  return (
    <div
      className="relative min-h-full bg-background"
      style={
        tenantPrimary
          ? ({
              ['--tenant-primary']: tenantPrimary,
            } as unknown as CSSProperties)
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/20 via-purple-500/10 to-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-primary/10 to-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.foreground/0.05),transparent_55%)]" />
      </div>

      <div className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 lg:static lg:z-auto lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none">
        <header className="border-b border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 lg:border-b-0 lg:bg-transparent lg:backdrop-blur-none">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-3 sm:px-6 sm:py-4">
            {tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenantLogoUrl}
                alt={activeTenant?.name ? `${activeTenant.name} logo` : 'Tenant logo'}
                className="h-7 w-7 shrink-0 rounded object-contain"
              />
            ) : (
              <div className="h-7 w-7 shrink-0 rounded bg-muted" />
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">
                {activeTenant?.name ?? 'Dashboard'}
              </div>
              <div className="text-xs text-muted-foreground">Active tenant</div>
            </div>

            <div className="ml-auto hidden h-2 w-28 overflow-hidden rounded-full bg-muted sm:block">
              <div
                className={cn('h-full w-full', tenantPrimary ? 'bg-[var(--tenant-primary)]' : 'bg-primary')}
              />
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-6xl items-center px-3 pb-3 sm:px-6 sm:pb-4">
            <div className="ml-auto">
              <TenantSwitcher />
            </div>
          </div>
        </header>

        <DashboardMobileNav mainItems={mainItems} admin={admin} />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/50 lg:block">
          <div className="px-3 py-2 text-sm font-semibold tracking-tight">Dashboard</div>
          <nav className="mt-1 flex flex-col gap-1">
            {mainItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start')}
              >
                {item.label}
              </Link>
            ))}

            {admin ? (
              <>
                <div className="mt-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {admin.label}
                </div>
                {admin.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'justify-start'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
