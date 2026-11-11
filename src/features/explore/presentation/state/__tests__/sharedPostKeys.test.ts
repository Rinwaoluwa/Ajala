import { describe, expect, it } from '@jest/globals';

import { POST_LIST_PREFIXES, explorePostKey } from '@shared/state/postQueryKeys';

import { exploreKeys } from '../exploreQueries';

const covered = (key: readonly unknown[]) =>
  POST_LIST_PREFIXES.some((prefix) => prefix.every((part, i) => key[i] === part));

describe("the shared post keys and Explore's", () => {
  it('reach the map, search and the mini card', () => {
    expect(explorePostKey('p1')).toEqual(exploreKeys.post('p1'));
    expect(covered(exploreKeys.search('surf'))).toBe(true);
    expect(covered(exploreKeys.pinsByInterest('i1', null))).toBe(true);
    expect(covered(exploreKeys.pins({ west: 0, south: 0, east: 1, north: 1 }, null, null))).toBe(true);
  });
});
