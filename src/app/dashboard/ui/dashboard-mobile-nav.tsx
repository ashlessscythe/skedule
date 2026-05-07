'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardAdminNav, DashboardNavItem } from '@/app/dashboard/nav-config';
import { isAdminNavActive, isMainNavActive } from '@/app/dashboard/nav-config';

function tabClassName(active: boolean) {
  return cn(
    buttonVariants({ variant: 'ghost', size: 'sm' }),
    'shrink-0 rounded-full px-3 text-xs font-medium sm:text-sm',
    active
      ? 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
      : 'text-muted-foreground hover:text-foreground'
  );
}

export function DashboardMobileNav(props: {
  mainItems: DashboardNavItem[];
  admin: DashboardAdminNav | null;
}) {
  const pathname = usePathname() ?? '';

  const adminActive = props.admin
    ? isAdminNavActive(pathname, props.admin.items)
    : false;

  return (
    <div className="border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-3 py-2 sm:px-6">
        <nav
          aria-label="Dashboard sections"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {props.mainItems.map((item) => {
            const active = isMainNavActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={tabClassName(active)}>
                {item.label}
              </Link>
            );
          })}

          {props.admin ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  tabClassName(adminActive),
                  'inline-flex items-center gap-0.5 data-popup-open:bg-primary/15'
                )}
              >
                {props.admin.label}
                <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Admin
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {props.admin.items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        render={
                          <Link
                            href={item.href}
                            className={cn(active && 'bg-accent/60 font-medium')}
                          >
                            {item.label}
                          </Link>
                        }
                      />
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
