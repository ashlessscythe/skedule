export type DashboardNavItem = {
  href: string;
  label: string;
};

export type DashboardAdminNav = {
  label: string;
  items: DashboardNavItem[];
};

export function buildDashboardNav(opts: {
  isStaffOrAdmin: boolean;
  isAdmin: boolean;
}): { mainItems: DashboardNavItem[]; admin: DashboardAdminNav | null } {
  const mainItems: DashboardNavItem[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/appointments', label: 'Appointments' },
    ...(opts.isStaffOrAdmin ? [{ href: '/dashboard/calendar', label: 'Calendar' }] : []),
    { href: '/dashboard/clients', label: 'Clients' },
    { href: '/dashboard/reporting', label: 'Reporting' },
  ];

  const admin: DashboardAdminNav | null = opts.isAdmin
    ? {
        label: 'Admin',
        items: [
          { href: '/dashboard/admin', label: 'Admin home' },
          { href: '/dashboard/admin/locations', label: 'Locations' },
          { href: '/dashboard/admin/audit', label: 'Audit log' },
          { href: '/dashboard/admin/staff', label: 'Staff' },
          { href: '/dashboard/admin/appointment-types', label: 'Appointment types' },
          { href: '/dashboard/admin/availability', label: 'Availability' },
          { href: '/dashboard/admin/branding', label: 'Branding' },
        ],
      }
    : null;

  return { mainItems, admin };
}

/** Whether a main nav item should show as active for the current path. */
export function isMainNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminNavActive(pathname: string, adminItems: DashboardNavItem[]): boolean {
  return adminItems.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
