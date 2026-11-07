import { describe, expect, it } from '@jest/globals';

import { tripDates } from '../format';

// Built in the phone's own time zone, as the cards read them, so the test holds anywhere.
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();

describe('trip dates', () => {
  it('writes one day when there is no end, or it ends the same day', () => {
    expect(tripDates(local(2026, 10, 18), null)).toBe('18 Oct');
    expect(tripDates(local(2026, 10, 18), local(2026, 10, 18, 22))).toBe('18 Oct');
  });

  it('writes a span when it ends on a later day', () => {
    expect(tripDates(local(2026, 10, 18), local(2026, 10, 20))).toBe('18–20 Oct');
    expect(tripDates(local(2026, 10, 30), local(2026, 11, 2))).toBe('30 Oct – 2 Nov');
    expect(tripDates(local(2026, 12, 30), local(2027, 1, 2))).toBe('30 Dec 2026 – 2 Jan 2027');
  });

  it('ignores an end before the start, and a missing start', () => {
    expect(tripDates(local(2026, 10, 18), local(2026, 10, 10))).toBe('18 Oct');
    expect(tripDates(null, local(2026, 10, 10))).toBeNull();
  });
});
