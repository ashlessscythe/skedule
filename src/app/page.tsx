import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const FEATURES = [
  {
    title: 'Multi-tenant by design',
    description:
      'Separate locations, staff, and clients cleanly—without duplicating setup or losing control.',
  },
  {
    title: 'Scheduling that stays flexible',
    description:
      'Appointment types, availability blocks, and recurrence rules that match how teams actually work.',
  },
  {
    title: 'Reporting you can act on',
    description:
      'Spot trends quickly with status and volume breakdowns—then fix bottlenecks before they grow.',
  },
  {
    title: 'Audit trail included',
    description:
      'Built-in audit logs for critical changes so you can stay compliant and confident.',
  },
] as const;

export default async function Home() {
  const session = await getServerSession(authOptions);
  const ctaHref = session ? '/dashboard' : '/auth/login';
  const ctaLabel = session ? 'Dashboard' : 'Get started';

  return (
    <div className="relative isolate overflow-hidden text-foreground">
      <div className="theme-ambient animate-theme-glow" aria-hidden />
      <div className="theme-ambient-mesh" aria-hidden />

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:pt-14">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-primary/20 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_70%,transparent)]" />
              Multi-tenant scheduling made clean
            </div>

            <h1 className="mt-5 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
              Run appointments like a{' '}
              <span className="theme-gradient-text animate-gradient-text">
                modern product
              </span>
              .
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              Skedule gives you the building blocks—locations, staff, clients, and
              auditability—so you can schedule faster, stay organized, and scale
              without chaos.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={ctaHref}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'border-0 bg-primary-gradient shadow-lg shadow-primary/25'
                )}
              >
                {ctaLabel}
              </Link>
              <Link
                href="#features"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/40'
                )}
              >
                View features
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted/60 px-3 py-1 ring-1 ring-foreground/10">
                Secure auth
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 ring-1 ring-foreground/10">
                Themeable UI
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 ring-1 ring-foreground/10">
                Built for teams
              </span>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-6 duration-900">
            <div
              className="absolute -inset-6 -z-10 rounded-3xl blur-2xl"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklch, var(--theme-glow-1) 60%, transparent), transparent, color-mix(in oklch, var(--theme-glow-2) 50%, transparent))',
              }}
              aria-hidden
            />
            <Card className="theme-card-glow border-border/50 bg-card/75 backdrop-blur ring-1 ring-primary/15 supports-[backdrop-filter]:bg-card/55">
              <CardHeader>
                <CardTitle>What you get</CardTitle>
                <CardDescription>
                  Opinionated defaults with room to grow.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.10)]" />
                  <div>
                    <div className="text-sm font-medium">Fast setup</div>
                    <div className="text-sm text-muted-foreground">
                      Start scheduling in minutes—then iterate.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.10)]" />
                  <div>
                    <div className="text-sm font-medium">Clear structure</div>
                    <div className="text-sm text-muted-foreground">
                      Tenants, locations, clients, and staff modeled explicitly.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 size-2 rounded-full bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.10)]" />
                  <div>
                    <div className="text-sm font-medium">Beautiful UI</div>
                    <div className="text-sm text-muted-foreground">
                      Semantic tokens so themes feel native everywhere.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="features" className="mt-16 sm:mt-20">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need to schedule with confidence
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                A cohesive foundation for appointments, staff scheduling, and
                tenant-aware operations—designed to look great in every theme.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, idx) => (
              <Card
                key={f.title}
                className={cn(
                  'border-border/50 bg-card/75 backdrop-blur ring-1 ring-primary/10 supports-[backdrop-filter]:bg-card/55',
                  'animate-in fade-in slide-in-from-bottom-3 duration-700',
                  idx === 0 && 'delay-0',
                  idx === 1 && 'delay-75',
                  idx === 2 && 'delay-150',
                  idx === 3 && 'delay-200'
                )}
              >
                <CardHeader>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-muted/60 via-card/40 to-accent/20 p-6 ring-1 ring-primary/15 backdrop-blur sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-medium">Ready to try it?</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Jump in and start scheduling—no detours.
              </div>
            </div>
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'border-0 bg-primary-gradient shadow-md shadow-primary/20'
              )}
            >
              {ctaLabel}
            </Link>
          </div>
        </section>

        <footer className="mt-16 border-t border-border/60 pt-8 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Skedule</span>
            <span className="text-xs">
              Built with semantic tokens for beautiful themes.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
