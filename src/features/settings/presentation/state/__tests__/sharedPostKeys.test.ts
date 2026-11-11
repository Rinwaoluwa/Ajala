import { describe, expect, it } from '@jest/globals';

import { BLOCKED_KEY, DRAFTS_KEY } from '@shared/state/postQueryKeys';

import { settingsKeys } from '../settingsQueries';

describe("the shared keys for Settings' lists", () => {
  it('match the drafts and blocked keys', () => {
    expect(DRAFTS_KEY).toEqual(settingsKeys.drafts);
    expect(BLOCKED_KEY).toEqual(settingsKeys.blocked);
  });
});
