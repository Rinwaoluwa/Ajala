import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { CommentsPage, PostComment, ReportReason, Viewer } from '../../domain/entities/PostDetail';
import { isPostDetailError, type PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { leavesTombstone, threadOf, tombstoneOf } from '../../domain/rules/commentRules';
import { postDetailKeys } from '../state/postDetailQueries';
import { usePostDetailUseCases } from '../state/usePostDetailUseCases';

type Pages = InfiniteData<CommentsPage, string | null>;

const codeOf = (e: unknown): PostDetailErrorCode => (isPostDetailError(e) ? e.code : 'unknown');

/**
 * View model for a post's comments (spec §2.18, Figma post detail "Comments").
 *
 * Top-level comments are an infinite query, oldest first, with `total` for the
 * header. Each thread's replies are their own query (`useReplies`), loaded only
 * once "View N replies" is opened.
 *
 * Sending is optimistic: the comment shows at once, dimmed, under the thread it
 * answers (which opens), is swapped for the server's copy, and is taken back
 * out if the send fails. A 409 `POST_CANCELLED` closes the composer.
 * Deleting asks first and then updates the lists from what the API does: a
 * top-level comment that has replies stays as "Comment deleted", anything else
 * goes. Reporting opens a dialog; its outcome is kept here for the screen.
 */
export function useComments(postId: string, viewer: Viewer | null, postClosed: boolean) {
  const { getComments, addComment, deleteComment, reportComment } = usePostDetailUseCases();
  const queryClient = useQueryClient();
  const key = postDetailKeys.comments(postId);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [openThreads, setOpenThreads] = useState<ReadonlySet<string>>(new Set());
  const [cancelledHere, setCancelledHere] = useState(false);
  const [reporting, setReporting] = useState<PostComment | null>(null);
  const [reportSent, setReportSent] = useState(false);

  const list = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getComments(postId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });

  const openThread = useCallback(
    (id: string) => setOpenThreads((open) => (open.has(id) ? open : new Set(open).add(id))),
    [],
  );

  const send = useMutation({
    mutationFn: (input: { text: string; parentId: string | null }) =>
      addComment(postId, input.text, input.parentId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const parentId = input.parentId;
      const repliesKey = parentId ? postDetailKeys.replies(postId, parentId) : null;
      const top = queryClient.getQueryData<Pages>(key);
      const replies = repliesKey ? queryClient.getQueryData<Pages>(repliesKey) : undefined;
      const pending: PostComment = {
        id: `pending-${Date.now()}`,
        postId,
        parentId,
        author: { userId: 'me', name: viewer?.name ?? 'You', avatarUrl: viewer?.avatarUrl ?? null },
        body: input.text.trim(),
        deleted: false,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        mine: true,
        canDelete: true,
        pending: true,
      };
      if (top) {
        const counted = withTotal(top, 1);
        queryClient.setQueryData(
          key,
          parentId ? mapItems(counted, (c) => (c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c)) : append(counted, pending),
        );
      }
      if (repliesKey && replies) queryClient.setQueryData(repliesKey, append(replies, pending));
      if (parentId) openThread(parentId);
      return { top, replies, repliesKey, pendingId: pending.id };
    },
    onSuccess: (comment, _input, context) => {
      if (!context) return;
      const { repliesKey, pendingId } = context;
      if (repliesKey) {
        // A thread opened by this reply had nothing cached: let it load, the reply included.
        if (context.replies) swapIn(queryClient, repliesKey, pendingId, comment);
        else void queryClient.invalidateQueries({ queryKey: repliesKey });
      } else swapIn(queryClient, key, pendingId, comment);
    },
    onError: (e, _input, context) => {
      if (context?.top) queryClient.setQueryData(key, context.top);
      if (context?.repliesKey && context.replies) queryClient.setQueryData(context.repliesKey, context.replies);
      if (codeOf(e) === 'postCancelled') {
        setCancelledHere(true);
        // The page still shows it as live: ask again, so the button and note catch up.
        void queryClient.invalidateQueries({ queryKey: postDetailKeys.post(postId) });
      }
    },
  });

  const remove = useMutation({
    mutationFn: (comment: PostComment) => deleteComment(postId, comment.id),
    onSuccess: (_r, comment) => {
      const top = queryClient.getQueryData<Pages>(key);
      if (comment.parentId === null) {
        if (top) {
          const counted = withTotal(top, -1);
          queryClient.setQueryData(
            key,
            leavesTombstone(comment)
              ? mapItems(counted, (c) => (c.id === comment.id ? tombstoneOf(c) : c))
              : without(counted, comment.id),
          );
        }
        return;
      }
      const parentId = comment.parentId;
      const repliesKey = postDetailKeys.replies(postId, parentId);
      const replies = queryClient.getQueryData<Pages>(repliesKey);
      if (replies) queryClient.setQueryData(repliesKey, without(replies, comment.id));
      if (top) {
        let next = mapItems(withTotal(top, -1), (c) =>
          c.id === parentId ? { ...c, replyCount: Math.max(0, c.replyCount - 1) } : c,
        );
        // A deleted comment whose last reply went has nothing left to show.
        const parent = next.pages.flatMap((p) => p.items).find((c) => c.id === parentId);
        if (parent?.deleted && parent.replyCount === 0) next = without(next, parentId);
        queryClient.setQueryData(key, next);
      }
    },
  });

  const report = useMutation({
    mutationFn: (input: { comment: PostComment; reason: ReportReason | null; details: string }) =>
      reportComment(postId, input.comment.id, input.reason, input.details),
    onSuccess: () => {
      setReporting(null);
      setReportSent(true);
    },
  });

  const comments = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.items), [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  /** Resolves with null once the comment is sent (the field can clear), or why it was not. */
  const submit = useCallback(
    async (text: string): Promise<PostDetailErrorCode | null> => {
      if (!text.trim()) return 'commentInvalid';
      try {
        await send.mutateAsync({ text, parentId: replyTo ? threadOf(replyTo) : null });
        setReplyTo(null);
        return null;
      } catch (e) {
        return codeOf(e);
      }
    },
    [send, replyTo],
  );

  return {
    comments,
    total,
    loading: list.isPending,
    failed: list.isError,
    retry: () => void list.refetch(),
    hasMore: !!list.hasNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },

    openThreads,
    toggleThread: (id: string) =>
      setOpenThreads((open) => {
        const next = new Set(open);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),

    replyTo,
    reply: setReplyTo,
    cancelReply: () => setReplyTo(null),
    submit,
    sending: send.isPending,
    /** The post was cancelled: no new comments (409 `POST_CANCELLED`). */
    closed: postClosed || cancelledHere,

    deleteComment: (comment: PostComment) => remove.mutateAsync(comment),

    reporting,
    startReport: (comment: PostComment) => {
      report.reset();
      setReporting(comment);
    },
    cancelReport: () => setReporting(null),
    submitReport: (reason: ReportReason | null, details: string) => {
      if (reporting) report.mutate({ comment: reporting, reason, details });
    },
    reportSubmitting: report.isPending,
    reportError: report.error ? codeOf(report.error) : null,
    reportSent,
    dismissReportSent: () => setReportSent(false),
  };
}

/** One thread's replies, oldest first; fetched only while the thread is open. */
export function useReplies(postId: string, commentId: string, open: boolean) {
  const { getReplies } = usePostDetailUseCases();
  const query = useInfiniteQuery({
    queryKey: postDetailKeys.replies(postId, commentId),
    queryFn: ({ pageParam }) => getReplies(postId, commentId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: open,
    staleTime: 30_000,
  });
  const replies = useMemo(() => (query.data?.pages ?? []).flatMap((p) => p.items), [query.data]);
  return {
    replies,
    loading: open && query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    hasMore: !!query.hasNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}

// ---------- cache edits (whole new objects; never in place) ----------

function mapItems(data: Pages, f: (c: PostComment) => PostComment): Pages {
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(f) })) };
}

function without(data: Pages, id: string): Pages {
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== id) })) };
}

/** Added at the end of the last page loaded: the list is oldest first. */
function append(data: Pages, comment: PostComment): Pages {
  const last = data.pages.length - 1;
  return { ...data, pages: data.pages.map((p, i) => (i === last ? { ...p, items: [...p.items, comment] } : p)) };
}

/** The header's count lives on the first page. */
function withTotal(data: Pages, change: number): Pages {
  return {
    ...data,
    pages: data.pages.map((p, i) => (i === 0 ? { ...p, total: Math.max(0, p.total + change) } : p)),
  };
}

function swapIn(queryClient: QueryClient, key: readonly unknown[], id: string, comment: PostComment) {
  const now = queryClient.getQueryData<Pages>(key);
  if (now) queryClient.setQueryData(key, mapItems(now, (c) => (c.id === id ? comment : c)));
}
