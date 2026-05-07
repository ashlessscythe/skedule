import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conditional classnames', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('tailwind-merges conflicting utilities', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

