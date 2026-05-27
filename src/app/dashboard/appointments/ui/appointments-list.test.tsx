/** @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentsList, type AppointmentRow } from './appointments-list';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/dashboard/appointments',
  useSearchParams: () => new URLSearchParams('upcoming=0'),
}));

let mockViewerTimeZone = 'America/Los_Angeles';
vi.mock('@/lib/scheduling/use-viewer-time-zone', () => ({
  useViewerTimeZone: () => mockViewerTimeZone,
}));

const baseRow: AppointmentRow = {
  id: 'a1',
  startTime: '2026-01-15T19:30:00.000Z',
  endTime: '2026-01-15T20:30:00.000Z',
  status: 'SCHEDULED',
  locationId: 'loc1',
  locationName: 'Main',
  locationTimeZone: 'America/New_York',
  clientId: 'c1',
  clientFirstName: 'Jane',
  clientLastName: 'Doe',
  clientEmail: null,
  staffId: null,
  staffFirstName: null,
  staffLastName: null,
  typeId: null,
  typeName: null,
  typeDurationMinutes: null,
};

describe('AppointmentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewerTimeZone = 'America/Los_Angeles';
  });

  it('shows appointment start in the location timezone, not raw UTC ISO', () => {
    render(
      <AppointmentsList
        rows={[baseRow]}
        locationOptions={[{ id: 'loc1', label: 'Main' }]}
        clientOptions={[{ id: 'c1', label: 'Doe, Jane' }]}
        staffOptions={[]}
        typeOptions={[]}
      />
    );

    expect(screen.getAllByText(/Jan 15, 2026 14:30 \(America\/New_York · UTC-5\)/).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText('2026-01-15T19:30:00.000Z')).not.toBeInTheDocument();
    expect(screen.queryByText(/When \(UTC\)/i)).not.toBeInTheDocument();
  });

  it('shows (local time) when location matches viewer timezone', () => {
    mockViewerTimeZone = 'America/New_York';

    render(
      <AppointmentsList
        rows={[{ ...baseRow, locationTimeZone: 'America/New_York' }]}
        locationOptions={[{ id: 'loc1', label: 'Main' }]}
        clientOptions={[{ id: 'c1', label: 'Doe, Jane' }]}
        staffOptions={[]}
        typeOptions={[]}
      />
    );

    expect(screen.getAllByText(/Jan 15, 2026 14:30 \(local time\)/).length).toBeGreaterThan(0);
  });
});
