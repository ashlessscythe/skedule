/** @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  AvailabilityGraphicalView,
  buildTimelineRows,
} from './availability-graphical-view';
import type { AvailabilitySegment } from '@/lib/scheduling/expand-availability-segments';

let mockViewerTimeZone = 'UTC';

vi.mock('@/lib/scheduling/use-viewer-time-zone', () => ({
  useViewerTimeZone: () => mockViewerTimeZone,
}));

vi.mock('../../ui/create-availability-dialog', () => ({
  CreateAvailabilityDialog: () => <button type="button">Add availability</button>,
}));

const segments: AvailabilitySegment[] = [
  {
    id: 'all:2025-06-16',
    staffId: null,
    staffLabel: 'All staff',
    kind: 'OPEN',
    dayKey: '2025-06-16',
    startMinutes: 540,
    endMinutes: 1020,
  },
  {
    id: 's1:2025-06-16',
    staffId: 'staff-1',
    staffLabel: 'Alex',
    kind: 'OPEN',
    dayKey: '2025-06-16',
    startMinutes: 600,
    endMinutes: 900,
  },
];

describe('buildTimelineRows', () => {
  it('puts All staff first when showing all staff', () => {
    const rows = buildTimelineRows({
      segments,
      staffFilter: 'ALL',
      staff: [
        { id: 'staff-1', label: 'Alex' },
        { id: 'staff-2', label: 'Blair' },
      ],
    });
    expect(rows[0]?.label).toBe('All staff');
    expect(rows.map((r) => r.label)).toEqual(['All staff', 'Alex', 'Blair']);
  });

  it('shows only selected staff and tenant-wide rows when filtered', () => {
    const rows = buildTimelineRows({
      segments,
      staffFilter: 'staff-1',
      staff: [{ id: 'staff-1', label: 'Alex' }],
    });
    expect(rows.map((r) => r.label)).toEqual(['All staff', 'Alex']);
  });
});

describe('AvailabilityGraphicalView', () => {
  beforeEach(() => {
    mockViewerTimeZone = 'UTC';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ segments }),
      }))
    );
  });

  it('renders availability bars and lists All staff before named staff', async () => {
    render(
      <AvailabilityGraphicalView
        locations={[{ id: 'loc1', name: 'Main', timeZone: 'UTC' }]}
        staff={[
          { id: 'staff-1', label: 'Alex' },
          { id: 'staff-2', label: 'Blair' },
        ]}
        initialNowIso="2025-06-16T12:00:00.000Z"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('availability-bar').length).toBeGreaterThan(0);
    });

    const labels = screen.getAllByTestId('timeline-row-label').map((el) => el.textContent);
    expect(labels[0]).toBe('All staff');
    expect(labels).toContain('Alex');
    expect(labels).toContain('Blair');
  });
});
