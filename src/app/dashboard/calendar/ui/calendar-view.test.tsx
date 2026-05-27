/** @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CalendarView } from './calendar-view';

let mockViewerTimeZone = 'America/Los_Angeles';

vi.mock('@/lib/scheduling/use-viewer-time-zone', () => ({
  useViewerTimeZone: () => mockViewerTimeZone,
}));

beforeEach(() => {
  mockViewerTimeZone = 'America/Los_Angeles';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        events: [
          {
            id: 'e1',
            kind: 'APPOINTMENT',
            title: 'Jane Doe',
            startUtc: '2026-01-15T19:30:00.000Z',
            endUtc: '2026-01-15T20:30:00.000Z',
            locationId: 'loc1',
            locationTimeZone: 'America/New_York',
            staffId: null,
          },
        ],
        warnings: [],
      }),
    }))
  );
});

describe('CalendarView', () => {
  it('shows event times in the selected location timezone', async () => {
    render(
      <CalendarView
        locations={[{ id: 'loc1', name: 'Main', timeZone: 'America/New_York' }]}
        staff={[]}
        viewerRole="ADMIN"
        initialNowIso="2026-01-14T12:00:00.000Z"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/14:30–15:30 \(America\/New_York · UTC-5\)/)
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/19:30/)).not.toBeInTheDocument();
  });
});
