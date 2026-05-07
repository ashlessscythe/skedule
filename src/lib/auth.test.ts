import { describe, expect, it } from 'vitest';
import { authOptions } from './auth';

describe('authOptions', () => {
  it('uses jwt session strategy and custom signIn page', () => {
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.pages?.signIn).toBe('/auth/login');
  });

  it('defines jwt and session callbacks', () => {
    expect(typeof authOptions.callbacks?.jwt).toBe('function');
    expect(typeof authOptions.callbacks?.session).toBe('function');
  });
});

