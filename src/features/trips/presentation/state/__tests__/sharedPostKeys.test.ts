import { describe, expect, it } from '@jest/globals';

import { POST_LIST_PREFIXES } from '@shared/state/postQueryKeys';

import { tripsKeys } from '../tripsQueries';

describe("the shared post keys and Trips'", () => {
  it('reach every Trips list', () => {
    expect(POST_LIST_PREFIXES.some((p) => p.every((part, i) => tripsKeys.all[i] === part))).toBe(true);
  });
});
