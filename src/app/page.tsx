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
    <div className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/25 via-purple-500/15 to-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-primary/15 to-fuchsia-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.foreground/0.06),transparent_55%)]" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:pt-14">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10">
              <span className="size-1.5 rounded-full bg-primary" />
              Multi-tenant scheduling made clean
            </div>

            <h1 className="mt-5 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
              Run appointments like a{' '}
              <span className="animate-gradient-text bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-500 bg-[length:200%_200%] bg-clip-text text-transparent">
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
              <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
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
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-primary/15 via-transparent to-cyan-500/15 blur-2xl" />
            <Card className="border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50">
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
                  'border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50',
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

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-muted/40 p-6 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-medium">Ready to try it?</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Jump in and start scheduling—no detours.
              </div>
            </div>
            <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
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
