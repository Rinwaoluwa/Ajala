import { describe, expect, it } from '@jest/globals';

import { POST_LIST_PREFIXES } from '@shared/state/postQueryKeys';

import { profileKeys } from '../profileQueries';

const covered = (key: readonly unknown[]) =>
  POST_LIST_PREFIXES.some((prefix) => prefix.every((part, i) => key[i] === part));

describe("the shared post keys and the profile's lists", () => {
  it('reach Saved, Going and a person’s activity', () => {
    expect(covered(profileKeys.saved('all' as never))).toBe(true);
    expect(covered(profileKeys.myRsvps('going' as never))).toBe(true);
    expect(covered(profileKeys.personActivity('u1', 'hosting' as never))).toBe(true);
  });
});
