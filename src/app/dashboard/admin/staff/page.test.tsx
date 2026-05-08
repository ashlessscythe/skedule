/** @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/dashboard/admin/staff',
    useSearchParams: () => new URLSearchParams(''),
  };
});

const getTenantContextMock = vi.fn();
const requireAdminMock = vi.fn();
vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: () => getTenantContextMock(),
  requireAdmin: (ctx: unknown) => requireAdminMock(ctx),
}));

const findManyMock = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userTenant: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

beforeEach(() => {
  getTenantContextMock.mockResolvedValue({
    userId: 'u1',
    tenantId: 't1',
    role: 'ADMIN',
    roles: [{ tenantId: 't1', role: 'ADMIN' }],
    allTenantIds: ['t1'],
  });
  findManyMock.mockResolvedValue([]);
  requireAdminMock.mockClear();

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }))
  );
  Object.defineProperty(window, 'location', {
    value: { reload: vi.fn() },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
});

describe('AdminStaffPage', () => {
  it('renders staff list and can open create dialog', async () => {
    const Page = (await import('./page')).default;
    findManyMock.mockResolvedValueOnce([
      {
        id: 'ut1',
        role: 'STAFF',
        status: 'ACTIVE',
        user: {
          id: 'u2',
          email: 'a@example.com',
          firstName: 'A',
          lastName: 'User',
          isActive: true,
        },
      },
    ]);

    const el = await Page();
    render(el as unknown as React.ReactElement);

    expect(await screen.findByRole('heading', { name: 'Staff' })).toBeInTheDocument();
    expect(screen.getAllByText('a@example.com')).toHaveLength(2);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add member/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText(/add staff member/i)[0]).toBeInTheDocument();
    await user.keyboard('{Escape}');
  }, 20000);

  it('submits create staff payload to /api/admin/staff', async () => {
    const Page = (await import('./page')).default;
    const el = await Page();
    render(el as unknown as React.ReactElement);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add member/i }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(/add staff member/i);
    await user.type(within(dialog).getByLabelText('Email'), 'new.user@example.com');
    await user.click(within(dialog).getByRole('button', { name: /^add$/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/admin/staff',
        expect.objectContaining({ method: 'POST' })
      );
    });
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const [, init] = calls[0] as [unknown, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({
      email: 'new.user@example.com',
      role: 'STAFF',
      status: 'ACTIVE',
    });
  }, 20000);
});

