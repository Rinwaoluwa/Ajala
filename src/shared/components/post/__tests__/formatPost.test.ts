import { describe, expect, it } from '@jest/globals';

import { formatCardDate, formatCardDay, formatClock, formatDistance } from '../formatPost';

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

describe('a list card’s day and time', () => {
  // Midday UTC: the same calendar day wherever the tests run.
  const NOW = new Date('2026-11-24T12:00:00Z');

  it('writes the weekday, the day and the month', () => {
    expect(formatCardDay('2026-11-26T12:00:00Z', NOW)).toBe('Thu 26 Nov');
  });

  it('adds the year only when it is not this one', () => {
    expect(formatCardDay('2027-01-07T12:00:00Z', NOW)).toBe('Thu 7 Jan 2027');
    expect(formatCardDay('2025-12-25T12:00:00Z', NOW)).toBe('Thu 25 Dec 2025');
  });

  it('writes nothing for a post with no date, or one it cannot read', () => {
    expect(formatCardDay(null, NOW)).toBeNull();
    expect(formatCardDay('not a date', NOW)).toBeNull();
    expect(formatClock(null)).toBeNull();
    expect(formatClock('not a date')).toBeNull();
  });

  it('writes the time on a twelve-hour clock', () => {
    expect(formatClock('2026-11-26T12:00:00Z')).toMatch(/^\d{1,2}:00\s?(AM|PM)$/);
  });
});
