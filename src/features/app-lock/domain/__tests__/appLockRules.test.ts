import { describe, expect, it } from '@jest/globals';

import { RELOCK_AFTER_MS, shouldRelock } from '../appLockRules';

describe('relocking on return', () => {
  it('asks again after five minutes away', () => {
    expect(shouldRelock(1_000, 1_000 + RELOCK_AFTER_MS)).toBe(true);
  });

  it('does not ask after a short trip away', () => {
    expect(shouldRelock(1_000, 1_000 + RELOCK_AFTER_MS - 1)).toBe(false);
  });

  it('does not ask when the app never went to the background', () => {
    expect(shouldRelock(null, Date.now())).toBe(false);
  });
});
