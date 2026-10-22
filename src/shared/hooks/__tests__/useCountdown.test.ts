import { describe, expect, it } from '@jest/globals';

import { formatCountdown } from '../useCountdown';

describe('formatCountdown', () => {
  it('shows minutes and zero-padded seconds', () => {
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(5)).toBe('0:05');
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('keeps counting in minutes past an hour', () => {
    expect(formatCountdown(3725)).toBe('62:05');
  });
});
