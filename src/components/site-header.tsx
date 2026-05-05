import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { UserMenu } from "@/app/dashboard/user-menu";

function SparkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2l1.4 6.1L20 12l-6.6 3.9L12 22l-1.4-6.1L4 12l6.6-3.9L12 2z"
        className="fill-primary"
      />
    </svg>
  );
}

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const ctaHref = session ? "/dashboard" : "/auth/login";
  const ctaLabel = session ? "Dashboard" : "Get started";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-foreground/10">
              <SparkIcon className="size-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Skedule</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />

          <Link
            href={ctaHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {ctaLabel}
          </Link>

          {session ? <UserMenu email={session.user?.email ?? ""} /> : null}
        </div>
      </div>
    </header>
  );
}

