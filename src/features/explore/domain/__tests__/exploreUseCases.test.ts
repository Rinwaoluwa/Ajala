import { describe, expect, it } from '@jest/globals';

import type { ExploreRepository } from '../repositories/ExploreRepository';
import { makeLoadMeetups, makeSearchPosts } from '../usecases/ExploreUseCases';

/** Records which list call a use case chose; every other method is unused here. */
function recorder() {
  const calls: unknown[][] = [];
  const page = { items: [], nextCursor: null };
  const repo = {
    getFeed: async (...args: unknown[]) => (calls.push(['feed', ...args]), page),
    searchPosts: async (...args: unknown[]) => (calls.push(['search', ...args]), page),
  } as unknown as ExploreRepository;
  return { repo, calls };
}

describe('meetups near you', () => {
  it('reads the feed of meetups with no interest: search needs words or interests', async () => {
    const { repo, calls } = recorder();
    await makeLoadMeetups(repo)(null);
    expect(calls).toEqual([['feed', 'meetup', null, 20]]);
  });

  it('searches meetups by the chosen interest', async () => {
    const { repo, calls } = recorder();
    await makeLoadMeetups(repo)('i1', 'c1');
    expect(calls).toEqual([['search', { words: null, interestIds: ['i1'], type: 'meetup' }, 'c1', 20]]);
  });
});

describe('post search', () => {
  it('never asks with fewer than two characters', async () => {
    const { repo, calls } = recorder();
    expect(await makeSearchPosts(repo)('a')).toEqual({ items: [], nextCursor: null });
    expect(calls).toEqual([]);
  });

  it('searches every type by words', async () => {
    const { repo, calls } = recorder();
    await makeSearchPosts(repo)(' jazz ');
    expect(calls).toEqual([['search', { words: 'jazz', interestIds: [], type: null }, null, 20]]);
  });
});
