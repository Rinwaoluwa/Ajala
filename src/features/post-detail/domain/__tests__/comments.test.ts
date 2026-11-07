import { describe, expect, it } from '@jest/globals';

import type { PostComment } from '../entities/PostDetail';
import type { PostDetailRepository } from '../repositories/PostDetailRepository';
import { canReport, commentsClosed, leavesTombstone, threadOf, tombstoneOf } from '../rules/commentRules';
import {
  COMMENT_MAX,
  REPORT_DETAILS_MAX,
  canSubmitCommentReport,
  makeAddComment,
  makeReportComment,
} from '../usecases/PostDetailUseCases';

const comment = (over: Partial<PostComment> = {}): PostComment => ({
  id: 'c1',
  postId: 'p1',
  parentId: null,
  author: { userId: 'u1', name: 'Ngozi Obi', avatarUrl: null },
  body: 'Hello',
  deleted: false,
  replyCount: 0,
  createdAt: '2026-11-03T10:00:00Z',
  mine: false,
  canDelete: false,
  ...over,
});

describe('adding a comment', () => {
  it('refuses an empty or over-long comment before sending, and allows 1000 characters', async () => {
    const sent: [string, string | null][] = [];
    const repo = {
      addComment: async (_id: string, body: string, parentId: string | null) => {
        sent.push([body, parentId]);
        return {} as never;
      },
    } as unknown as PostDetailRepository;
    const add = makeAddComment(repo);
    expect(COMMENT_MAX).toBe(1000);
    await expect(add('p', '   ')).rejects.toMatchObject({ code: 'commentInvalid' });
    await expect(add('p', 'x'.repeat(COMMENT_MAX + 1))).rejects.toMatchObject({ code: 'commentInvalid' });
    await add('p', 'x'.repeat(COMMENT_MAX));
    await add('p', '  Count me in!  ', 'c1');
    expect(sent[1]).toEqual(['Count me in!', 'c1']);
  });
});

describe('threads', () => {
  it('puts a reply to a reply under the same top-level comment', () => {
    expect(threadOf(comment({ id: 'c1' }))).toBe('c1');
    expect(threadOf(comment({ id: 'r1', parentId: 'c1' }))).toBe('c1');
  });

  it('keeps a deleted top-level comment only while it has replies', () => {
    expect(leavesTombstone(comment({ replyCount: 2 }))).toBe(true);
    expect(leavesTombstone(comment({ replyCount: 0 }))).toBe(false);
    expect(leavesTombstone(comment({ parentId: 'c0' }))).toBe(false);
    expect(tombstoneOf(comment({ mine: true, canDelete: true }))).toMatchObject({
      deleted: true,
      author: null,
      body: null,
      canDelete: false,
    });
  });

  it('offers Report on other people’s live comments only', () => {
    expect(canReport(comment())).toBe(true);
    expect(canReport(comment({ mine: true }))).toBe(false);
    expect(canReport(comment({ deleted: true }))).toBe(false);
  });

  it('closes comments on a cancelled post', () => {
    expect(commentsClosed({ status: 'cancelled' })).toBe(true);
    expect(commentsClosed({ status: 'published' })).toBe(false);
    expect(commentsClosed(null)).toBe(false);
  });
});

describe('reporting a comment', () => {
  it('needs a reason, and details with "other"', () => {
    expect(canSubmitCommentReport(null, '')).toBe(false);
    expect(canSubmitCommentReport('spam', '')).toBe(true);
    expect(canSubmitCommentReport('other', '  ')).toBe(false);
    expect(canSubmitCommentReport('other', 'They keep posting links')).toBe(true);
    expect(canSubmitCommentReport('spam', 'x'.repeat(REPORT_DETAILS_MAX + 1))).toBe(false);
  });

  it('sends trimmed details, or none', async () => {
    const sent: unknown[] = [];
    const repo = {
      reportComment: async (...args: unknown[]) => void sent.push(args),
    } as unknown as PostDetailRepository;
    const report = makeReportComment(repo);
    await report('p1', 'c1', 'spam', '   ');
    await report('p1', 'c1', 'other', ' links ');
    expect(sent).toEqual([
      ['p1', 'c1', 'spam', null],
      ['p1', 'c1', 'other', 'links'],
    ]);
    await expect(report('p1', 'c1', null, '')).rejects.toMatchObject({ code: 'reportInvalid' });
  });
});
