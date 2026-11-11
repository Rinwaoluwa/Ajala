import { describe, expect, it } from '@jest/globals';

import { splitIntoRows } from '../PillRows';

describe('splitting pills into rows', () => {
  it('keeps the order and makes the rows about the same length', () => {
    // Nine pills of 100: three rows of three.
    expect(splitIntoRows(Array(9).fill(100), 3, 8)).toEqual([0, 3, 6]);
    // Uneven widths still split in order.
    expect(splitIntoRows([200, 50, 50, 100, 100, 200], 3, 0)).toEqual([0, 2, 5]);
  });

  it('never makes more rows than asked, nor more rows than pills', () => {
    expect(splitIntoRows([100, 100], 3, 8)).toEqual([0, 1]);
    expect(splitIntoRows([100], 3, 8)).toEqual([0]);
    expect(splitIntoRows(Array(20).fill(80), 3, 8)).toHaveLength(3);
  });

  it('gives every row at least one pill', () => {
    expect(splitIntoRows([1000, 10, 10], 3, 8)).toEqual([0, 1, 2]);
  });
});
