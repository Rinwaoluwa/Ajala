import { describe, expect, it } from '@jest/globals';

import { isOldEnough } from '../age';

const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('isOldEnough', () => {
  it('is true from the 18th birthday on', () => {
    expect(isOldEnough('2008-11-11', on(2026, 11, 11))).toBe(true);
    expect(isOldEnough('2008-11-10', on(2026, 11, 11))).toBe(true);
    expect(isOldEnough('1990-01-01', on(2026, 11, 11))).toBe(true);
  });

  it('is false the day before', () => {
    expect(isOldEnough('2008-11-12', on(2026, 11, 11))).toBe(false);
    expect(isOldEnough('2015-05-05', on(2026, 11, 11))).toBe(false);
  });

  it('counts a 29 February birthday from 1 March in a year without one', () => {
    expect(isOldEnough('2008-02-29', on(2026, 2, 28))).toBe(false);
    expect(isOldEnough('2008-02-29', on(2026, 3, 1))).toBe(true);
  });

  it('is false for anything that is not a date', () => {
    expect(isOldEnough('', on(2026, 11, 11))).toBe(false);
    expect(isOldEnough('11/11/2000', on(2026, 11, 11))).toBe(false);
  });
});
