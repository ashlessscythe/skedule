import { describe, expect, it } from 'vitest';
import { generateOpaqueToken } from './tokens';

describe('generateOpaqueToken', () => {
  it('generates base64url strings (default 32 bytes)', () => {
    const t = generateOpaqueToken();
    expect(t.length).toBeGreaterThan(10);
    expect(/^[A-Za-z0-9_-]+$/.test(t)).toBe(true);
  });

  it('generates roughly sized output for different byte lengths', () => {
    const t8 = generateOpaqueToken(8);
    const t16 = generateOpaqueToken(16);
    expect(t16.length).toBeGreaterThan(t8.length);
  });

  it('generates different tokens on repeated calls', () => {
    const a = generateOpaqueToken(16);
    const b = generateOpaqueToken(16);
    expect(a).not.toBe(b);
  });
});

