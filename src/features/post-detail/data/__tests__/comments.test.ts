import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { toCommentsError, toCommentsPage } from '../mappers/postDetailMappers';

describe('comments over the API', () => {
  it('reads a missing comments endpoint as "not available yet", not a missing post', () => {
    const e = toCommentsError(new ApiError({ code: 'NOT_FOUND', message: 'no route', status: 404 }));
    expect(e.code).toBe('commentsUnavailable');
    expect(toCommentsError(new ApiError({ code: 'NETWORK', message: 'down' })).code).toBe('network');
  });

  it('maps a page, keeping who a reply answers', () => {
    const page = toCommentsPage({
      items: [
        {
          id: 'c1',
          user: { id: 'u', displayName: 'Ngozi Obi', avatarUrl: null },
          text: 'Should we bring swimming gear?',
          createdAt: '2026-11-03T10:00:00Z',
          replyTo: { id: 'c0', displayName: 'Biodun Martins' },
        },
      ],
      nextCursor: null,
      total: 4,
    });
    expect(page.total).toBe(4);
    expect(page.items[0]?.replyTo).toEqual({ commentId: 'c0', name: 'Biodun Martins' });
  });
});
