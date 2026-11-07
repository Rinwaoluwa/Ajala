import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import type { CommentDto } from '../dto/postDetailDtos';
import { toCommentsPage, toPostDetailError } from '../mappers/postDetailMappers';
import { createPostDetailRepository } from '../repositories/PostDetailRepositoryImpl';

type Call = { method: string; path: string; body?: unknown };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createPostDetailRepository(request), calls };
}

const comment = (over: Partial<CommentDto> = {}): CommentDto => ({
  id: 'c1',
  postId: 'p1',
  parentId: null,
  author: { id: 'u1', displayName: 'Ngozi Obi', avatarUrl: null, verified: false },
  body: 'Should we bring swimming gear?',
  deleted: false,
  replyCount: 2,
  createdAt: '2026-11-03T10:00:00Z',
  mine: false,
  canDelete: false,
  ...over,
});

describe('comments over the API', () => {
  it('maps a page with its total and reply counts', () => {
    const page = toCommentsPage({ items: [comment()], nextCursor: null, total: 4 });
    expect(page.total).toBe(4);
    expect(page.items[0]).toMatchObject({
      author: { userId: 'u1', name: 'Ngozi Obi' },
      body: 'Should we bring swimming gear?',
      replyCount: 2,
      deleted: false,
    });
  });

  it('keeps a deleted comment with no author or body, and nothing to delete or report', () => {
    const page = toCommentsPage({
      items: [comment({ deleted: true, author: null, body: null, mine: true, canDelete: true })],
      nextCursor: null,
      total: 2,
    });
    expect(page.items[0]).toMatchObject({ deleted: true, author: null, body: null, mine: false, canDelete: false });
  });

  it('reads 404 as the post being gone now that comments exist', () => {
    expect(toPostDetailError(new ApiError({ code: 'NOT_FOUND', message: 'x', status: 404 })).code).toBe(
      'notFound',
    );
  });

  it('calls the documented paths with { body, parentId }', async () => {
    const { repo, calls } = fake((call) =>
      call.method === 'GET' ? { items: [], nextCursor: null, total: 0 } : call.method === 'POST' && call.path.endsWith('/comments') ? comment() : undefined,
    );
    await repo.getComments('p1', null, 20);
    await repo.getReplies('p1', 'c1', '20', 20);
    await repo.addComment('p1', 'Top level', null);
    await repo.addComment('p1', 'A reply', 'c1');
    await repo.deleteComment('p1', 'c2');
    await repo.reportComment('p1', 'c3', 'spam', null);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /api/v1/posts/p1/comments?limit=20',
      'GET /api/v1/posts/p1/comments/c1/replies?cursor=20&limit=20',
      'POST /api/v1/posts/p1/comments',
      'POST /api/v1/posts/p1/comments',
      'DELETE /api/v1/posts/p1/comments/c2',
      'POST /api/v1/posts/p1/comments/c3/report',
    ]);
    expect(calls[2]?.body).toEqual({ body: 'Top level' });
    expect(calls[3]?.body).toEqual({ body: 'A reply', parentId: 'c1' });
    expect(calls[5]?.body).toEqual({ reason: 'spam' });
  });

  it('reads a comment on a cancelled post, and a refused body, by code', async () => {
    const cancelled = new ApiError({ code: 'POST_CANCELLED', message: 'x', status: 409 });
    await expect(fake(() => cancelled).repo.addComment('p1', 'hi', null)).rejects.toMatchObject({
      code: 'postCancelled',
    });
    const tooLong = new ApiError({ code: 'VALIDATION_FAILED', message: 'x', status: 400 });
    await expect(fake(() => tooLong).repo.addComment('p1', 'hi', null)).rejects.toMatchObject({
      code: 'commentInvalid',
    });
  });

  it('reads a report’s 403, 409 and 400 as paused, already reported and refused', async () => {
    const report = (code: string, status: number) =>
      fake(() => new ApiError({ code: code as never, message: 'x', status })).repo.reportComment(
        'p1',
        'c1',
        'other',
        'details',
      );
    await expect(report('REPORTING_PAUSED', 403)).rejects.toMatchObject({ code: 'reportingPaused' });
    await expect(report('CONFLICT', 409)).rejects.toMatchObject({ code: 'alreadyReported' });
    await expect(report('BAD_REQUEST', 400)).rejects.toMatchObject({ code: 'reportInvalid' });
  });
});
