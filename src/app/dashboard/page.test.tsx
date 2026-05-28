import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const getTenantContextMock = vi.fn();
vi.mock('@/lib/tenant-context', () => ({
  getTenantContext: (...args: unknown[]) => getTenantContextMock(...args),
}));

const loadOverviewDataMock = vi.fn();
vi.mock('./overview/load-overview-data', () => ({
  loadOverviewData: (...args: unknown[]) => loadOverviewDataMock(...args),
}));

describe('DashboardPage', () => {
  it('renders staff overview for STAFF role', async () => {
    getTenantContextMock.mockResolvedValueOnce({
      userId: 'u1',
      tenantId: 't1',
      role: 'STAFF',
      allTenantIds: ['t1'],
      roles: [{ tenantId: 't1', role: 'STAFF' }],
    });
    loadOverviewDataMock.mockResolvedValueOnce({
      role: 'STAFF',
      tenantName: 'Acme Clinic',
      stats: { todayCount: 2, weekCount: 5, checkedInTodayCount: 1 },
      todayAppointments: [],
    });

    const DashboardPage = (await import('./page')).default;
    const el = await DashboardPage();
    const html = renderToStaticMarkup(el as unknown as React.ReactElement);

    expect(html).toContain('Acme Clinic');
    expect(html).toContain('Your schedule today');
    expect(html).toContain('Checked in today');
    expect(html).not.toContain('pending approval');
  });

  it('renders admin overview with pending banner for ADMIN role', async () => {
    getTenantContextMock.mockResolvedValueOnce({
      userId: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      allTenantIds: ['t1'],
      roles: [{ tenantId: 't1', role: 'ADMIN' }],
    });
    loadOverviewDataMock.mockResolvedValueOnce({
      role: 'ADMIN',
      tenantName: 'Acme Clinic',
      pendingStaffCount: 2,
      stats: {
        todayCount: 4,
        weekScheduledCount: 12,
        activeClientsCount: 30,
        activeStaffCount: 5,
        noShowRate7d: 0.1,
      },
      todayTenantAppointments: [],
      myTodayAppointments: [],
    });

    const DashboardPage = (await import('./page')).default;
    const el = await DashboardPage();
    const html = renderToStaticMarkup(el as unknown as React.ReactElement);

    expect(html).toContain('2 registrations pending approval');
    expect(html).toContain('/dashboard/admin/staff?status=PENDING');
    expect(html).toContain('Today at a glance');
    expect(html).toContain('Your schedule today');
    expect(html).toContain('No-show rate (7d)');
  });
});
