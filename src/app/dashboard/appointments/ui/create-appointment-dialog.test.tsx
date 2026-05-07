/** @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateAppointmentDialog } from './create-appointment-dialog';

beforeEach(() => {
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

describe('CreateAppointmentDialog', () => {
  it('shows recurrence controls and posts recurrenceRule payload', async () => {
    const user = userEvent.setup();
    render(
      <CreateAppointmentDialog
        locations={[{ id: 'loc1', label: 'HQ' }]}
        clients={[{ id: 'c1', label: 'Doe, Jane' }]}
        staff={[{ id: 's1', label: 'Staff One' }]}
        types={[{ id: 't1', label: 'Consult', durationMinutes: 45 }]}
      />
    );

    await user.click(screen.getByRole('button', { name: /new appointment/i }));
    await user.type(screen.getByLabelText('Start'), '2026-05-07T10:00');

    await user.click(screen.getByLabelText(/repeating series/i));
    expect(await screen.findByText(/each occurrence is stored/i)).toBeInTheDocument();

    const every = screen.getByLabelText('Every');
    fireEvent.change(every, { target: { value: '2' } });

    const totalOccurrences = screen.getByLabelText(/total occurrences/i);
    fireEvent.change(totalOccurrences, { target: { value: '5' } });

    await user.click(screen.getByRole('button', { name: /create series/i }));

    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0]![0]).toBe('/api/appointments');

    const init = calls[0]![1] as { body: string; method: string };
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body) as Record<string, unknown>;

    expect(body).toMatchObject({
      locationId: 'loc1',
      clientId: 'c1',
      staffId: null,
      typeId: null,
      durationMinutes: 30,
      notes: null,
      recurrenceRule: {
        frequency: 'WEEKLY',
        interval: 2,
        count: 5,
      },
    });

    expect(typeof body.startTime).toBe('string');
    expect(new Date(body.startTime as string).toISOString()).toBe(body.startTime);
  });
});

