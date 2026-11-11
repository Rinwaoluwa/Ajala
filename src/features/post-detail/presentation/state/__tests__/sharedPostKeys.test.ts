import { describe, expect, it } from '@jest/globals';

import { postAttendeesKey, postPageKey } from '@shared/state/postQueryKeys';

import { postDetailKeys } from '../postDetailQueries';

describe("the shared keys for a post's page", () => {
  it('match the keys the post page uses, so other features refresh it', () => {
    expect(postPageKey('p1')).toEqual(postDetailKeys.post('p1'));
    expect(postAttendeesKey('p1')).toEqual(postDetailKeys.attendeesOf('p1'));
  });
});
