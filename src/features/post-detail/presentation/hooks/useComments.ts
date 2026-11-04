import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { CommentsPage, PostComment, Viewer } from '../../domain/entities/PostDetail';
import { isPostDetailError, type PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { postDetailKeys } from '../state/postDetailQueries';
import { usePostDetailUseCases } from '../state/usePostDetailUseCases';

/**
 * View model for a post's comments (Figma post detail, "Comments").
 *
 * The list is an infinite query, oldest first. Sending is a mutation that adds
 * the comment at once — dimmed until the server confirms it, then swapped for
 * the real one — and takes it back out if the send fails.
 *
 * Comments are not in the API yet (API map §12): the calls go to a proposed
 * endpoint. While it does not exist, `unavailable` is true — the section shows
 * its empty state, and a send keeps the text and says comments are coming.
 */
export function useComments(postId: string, viewer: Viewer | null) {
  const { getComments, addComment } = usePostDetailUseCases();
  const queryClient = useQueryClient();
  const key = postDetailKeys.comments(postId);
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  const list = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getComments(postId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });

  const unavailable = isPostDetailError(list.error) && list.error.code === 'commentsUnavailable';

  const send = useMutation({
    mutationFn: (input: { text: string; replyTo: PostComment | null }) =>
      addComment(postId, input.text, input.replyTo?.id ?? null),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<InfiniteData<CommentsPage>>(key);
      const pending: PostComment = {
        id: `pending-${Date.now()}`,
        author: { userId: 'me', name: viewer?.name ?? 'You', avatarUrl: viewer?.avatarUrl ?? null },
        text: input.text.trim(),
        createdAt: new Date().toISOString(),
        replyTo: input.replyTo ? { commentId: input.replyTo.id, name: input.replyTo.author.name } : null,
        pending: true,
      };
      if (before) queryClient.setQueryData(key, appendTo(before, pending));
      return { before, pendingId: pending.id };
    },
    onSuccess: (comment, _input, context) => {
      const now = queryClient.getQueryData<InfiniteData<CommentsPage>>(key);
      if (now && context) queryClient.setQueryData(key, replaceIn(now, context.pendingId, comment));
    },
    onError: (_e, _input, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before);
    },
  });

  const comments = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.items), [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  /** Resolves with null once the comment is sent (the field can clear), or why it was not. */
  const submit = useCallback(
    async (text: string): Promise<PostDetailErrorCode | null> => {
      if (!text.trim()) return 'commentInvalid';
      try {
        await send.mutateAsync({ text, replyTo });
        setReplyTo(null);
        return null;
      } catch (e) {
        return isPostDetailError(e) ? e.code : 'unknown';
      }
    },
    [send, replyTo],
  );

  return {
    comments,
    total,
    loading: list.isPending && !unavailable,
    unavailable,
    hasMore: !!list.hasNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },
    replyTo,
    reply: setReplyTo,
    cancelReply: () => setReplyTo(null),
    submit,
    sending: send.isPending,
  };
}

function appendTo(data: InfiniteData<CommentsPage>, comment: PostComment): InfiniteData<CommentsPage> {
  const pages = data.pages.map((p, i) =>
    i === data.pages.length - 1 ? { ...p, items: [...p.items, comment] } : p,
  );
  return { ...data, pages: pages.map((p, i) => (i === 0 ? { ...p, total: p.total + 1 } : p)) };
}

function replaceIn(
  data: InfiniteData<CommentsPage>,
  id: string,
  comment: PostComment,
): InfiniteData<CommentsPage> {
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.map((c) => (c.id === id ? comment : c)) })),
  };
}
