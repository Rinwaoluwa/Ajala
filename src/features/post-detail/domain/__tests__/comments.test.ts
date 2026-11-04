import { describe, expect, it } from '@jest/globals';

import type { PostDetailRepository } from '../repositories/PostDetailRepository';
import { COMMENT_MAX, makeAddComment } from '../usecases/PostDetailUseCases';

describe('adding a comment', () => {
  it('refuses an empty or over-long comment before sending', async () => {
    const sent: string[] = [];
    const repo = {
      addComment: async (_id: string, text: string) => {
        sent.push(text);
        return {} as never;
      },
    } as unknown as PostDetailRepository;
    const add = makeAddComment(repo);
    await expect(add('p', '   ')).rejects.toMatchObject({ code: 'commentInvalid' });
    await expect(add('p', 'x'.repeat(COMMENT_MAX + 1))).rejects.toMatchObject({ code: 'commentInvalid' });
    await add('p', '  Count me in!  ');
    expect(sent).toEqual(['Count me in!']);
  });
});
