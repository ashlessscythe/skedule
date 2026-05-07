import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const redirectMock = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({
  redirect: (to: string) => redirectMock(to),
  usePathname: () => '/dashboard/admin',
}));

const getServerSessionMock = vi.fn();
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

const findUniqueMock = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

describe('DashboardLayout', () => {
  it('redirects to /auth/login when not authenticated', async () => {
    const DashboardLayout = (await import('./layout')).default;
    getServerSessionMock.mockResolvedValueOnce(null);

    await expect(
      DashboardLayout({ children: React.createElement('div', null, 'child') })
    ).rejects.toThrow('REDIRECT:/auth/login');
    expect(redirectMock).toHaveBeenCalledWith('/auth/login');
  });

  it('renders admin nav links for ADMIN role', async () => {
    const DashboardLayout = (await import('./layout')).default;
    getServerSessionMock.mockResolvedValueOnce({
      userId: 'u1',
      primaryTenantId: 't1',
      roles: [{ tenantId: 't1', role: 'ADMIN' }],
    });
    findUniqueMock.mockResolvedValueOnce({
      name: 'Acme Clinic',
      branding: { logoUrl: null, primaryColor: '#0ea5e9' },
    });

    const el = await DashboardLayout({ children: React.createElement('div', null, 'child') });
    const html = renderToStaticMarkup(el as unknown as React.ReactElement);

    expect(html).toContain('Acme Clinic');
    expect(html).toContain('Admin');
    expect(html).toContain('Branding');
    expect(html).toContain('Staff');
  });
});

