import { describe, expect, it } from '@jest/globals';

import { formatCardDate, formatDistance } from '../formatPost';

describe('post card text', () => {
  it('writes distances the way the card does', () => {
    expect(formatDistance(7.4)).toBe('7 km away');
    expect(formatDistance(0.3)).toBe('Under 1 km away');
    expect(formatDistance(null)).toBeNull();
  });

  it('writes the date as "Thu 22 Oct"', () => {
    expect(formatCardDate('2026-10-22T12:00:00Z')).toBe('Thu 22 Oct');
    expect(formatCardDate('not a date')).toBeNull();
  });
});
