import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import type { ChatMessage, MessagesPage } from '../../domain/entities/Chat';
import { isChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import { conversationItems } from '../../domain/rules/chatRules';
import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * View model for one conversation (Figma Chat 1:1 / Chat group): the thread,
 * its messages oldest first with day dividers and the activity card, and
 * sending.
 *
 * Messages page newest first (an infinite query); older pages load as the
 * person scrolls up. Sending is a mutation that shows the message at once —
 * dimmed, "Sending…" — then swaps in the server's, and takes it back out if the
 * send fails. Opening a conversation marks it read and refreshes the list.
 */
export function useConversation(threadId: string) {
  const { getThread, getMessages, sendMessage, markRead } = useChatUseCases();
  const queryClient = useQueryClient();
  const messagesKey = chatKeys.messages(threadId);

  const thread = useQuery({ queryKey: chatKeys.thread(threadId), queryFn: () => getThread(threadId) });

  const messages = useInfiniteQuery({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => getMessages(threadId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 10_000,
  });

  const read = useMutation({
    mutationFn: () => markRead(threadId),
    onSuccess: () => {
      queryClient.setQueryData(chatKeys.thread(threadId), (t: typeof thread.data) =>
        t ? { ...t, unreadCount: 0 } : t,
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
    },
  });
  const unread = thread.data?.unreadCount ?? 0;
  const { mutate: markAsRead } = read;
  useEffect(() => {
    if (unread > 0) markAsRead();
  }, [unread, markAsRead]);

  const send = useMutation({
    mutationFn: (text: string) => sendMessage(threadId, text),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const before = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
      const pending: ChatMessage = {
        id: `pending-${Date.now()}`,
        sender: { id: 'me', name: 'You', avatarUrl: null },
        fromMe: true,
        text: text.trim(),
        sentAt: new Date().toISOString(),
        status: 'sent',
        pending: true,
      };
      if (before) queryClient.setQueryData(messagesKey, prepend(before, pending));
      return { before, pendingId: pending.id };
    },
    onSuccess: (message, _text, context) => {
      const now = queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey);
      if (now && context) queryClient.setQueryData(messagesKey, replace(now, context.pendingId, message));
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
    },
    onError: (_e, _text, context) => {
      if (context?.before) queryClient.setQueryData(messagesKey, context.before);
    },
  });

  const oldestFirst = useMemo(
    () => (messages.data?.pages ?? []).flatMap((p) => p.items).reverse(),
    [messages.data],
  );
  const items = useMemo(
    () =>
      conversationItems(oldestFirst, {
        group: thread.data?.kind === 'group',
        hasPost: !!thread.data?.post,
      }),
    [oldestFirst, thread.data?.kind, thread.data?.post],
  );

  /** Resolves with null once sent (the field can clear), or why it was not. */
  const submit = useCallback(
    async (text: string): Promise<ChatErrorCode | null> => {
      if (!text.trim()) return 'invalid';
      try {
        await send.mutateAsync(text);
        return null;
      } catch (e) {
        return isChatError(e) ? e.code : 'unknown';
      }
    },
    [send],
  );

  const failure = thread.error ?? messages.error;
  const errorCode: ChatErrorCode | null = failure ? (isChatError(failure) ? failure.code : 'unknown') : null;

  return {
    thread: thread.data ?? null,
    items,
    hasMessages: oldestFirst.length > 0,
    loading: thread.isPending || messages.isPending,
    error: errorCode,
    retry: () => {
      void thread.refetch();
      void messages.refetch();
    },
    loadOlder: () => {
      if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
    },
    loadingOlder: messages.isFetchingNextPage,
    submit,
    sending: send.isPending,
  };
}

function prepend(data: InfiniteData<MessagesPage>, message: ChatMessage): InfiniteData<MessagesPage> {
  return {
    ...data,
    pages: data.pages.map((p, i) => (i === 0 ? { ...p, items: [message, ...p.items] } : p)),
  };
}

function replace(
  data: InfiniteData<MessagesPage>,
  id: string,
  message: ChatMessage,
): InfiniteData<MessagesPage> {
  return {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === id ? message : m)) })),
  };
}
