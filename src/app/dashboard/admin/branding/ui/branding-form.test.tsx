/** @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandingForm } from './branding-form';

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

describe('BrandingForm', () => {
  it('renders and saves basic payload', async () => {
    render(
      <BrandingForm
        initialBranding={{
          logoUrl: null,
          primaryColor: '#000000',
          secondaryColor: null,
          accentColor: null,
          emailFromName: null,
          emailFromAddress: null,
          updatedAt: null,
        }}
      />
    );

    await userEvent.clear(screen.getByLabelText('Logo URL'));
    await userEvent.type(screen.getByLabelText('Logo URL'), 'https://example.com/logo.png');
    await userEvent.clear(screen.getByLabelText('Email from name'));
    await userEvent.type(screen.getByLabelText('Email from name'), 'Acme');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls[0]![0]).toBe('/api/admin/branding');
    const init = calls[0]![1] as { body: string; method: string };
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toMatchObject({
      logoUrl: 'https://example.com/logo.png',
      emailFromName: 'Acme',
    });
  });
});

