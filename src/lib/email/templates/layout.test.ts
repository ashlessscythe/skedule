import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  renderEmailButton,
  renderEmailDetailCard,
  renderEmailLayout,
} from './layout';

describe('renderEmailLayout', () => {
  it('includes title, badge, body, and footer', () => {
    const html = renderEmailLayout({
      title: 'Test headline',
      badge: 'Status',
      bodyHtml: '<p>Hello</p>',
      footerHtml: 'Footer text',
      accent: 'success',
    });
    expect(html).toContain('Test headline');
    expect(html).toContain('Status');
    expect(html).toContain('Hello');
    expect(html).toContain('Footer text');
    expect(html).toContain('#047857');
  });
});

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('a & b <c>')).toBe('a &amp; b &lt;c&gt;');
  });
});

describe('renderEmailButton', () => {
  it('includes href and label', () => {
    const html = renderEmailButton('https://example.com/reset', 'Reset');
    expect(html).toContain('https://example.com/reset');
    expect(html).toContain('Reset');
  });
});

describe('renderEmailDetailCard', () => {
  it('renders labeled rows', () => {
    const html = renderEmailDetailCard([
      { label: 'When', value: 'Tomorrow' },
      { label: 'Where', value: 'Main St' },
    ]);
    expect(html).toContain('When');
    expect(html).toContain('Tomorrow');
    expect(html).toContain('Main St');
  });
});
