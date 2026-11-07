import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { ChatEvent, ChatMessage, ChatThreadDetail, MessagesPage } from '../../domain/entities/Chat';
import { TYPING_SHOWN_MS, upsertNewest, withReadMark } from '../../domain/rules/chatRules';
import { chatKeys, type TypingState } from './chatQueries';

/**
 * Writes into a conversation's cached messages: replaces the copy already held
 * (matched by id or `clientMsgId`, on whichever page it is), or adds it as the
 * newest. A conversation that was never opened has nothing cached and is left
 * alone; it is fetched whole when it opens.
 */
export function putMessage(queryClient: QueryClient, message: ChatMessage) {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages(message.conversationId), (data) => {
    if (!data) return data;
    const holder = data.pages.findIndex((p) =>
      p.items.some((m) => m.id === message.id || m.clientMsgId === message.clientMsgId),
    );
    const at = holder === -1 ? 0 : holder;
    return {
      ...data,
      pages: data.pages.map((p, i) => (i === at ? { ...p, items: upsertNewest(p.items, message) } : p)),
    };
  });
}

/** Takes a message back out (a send that failed). */
export function dropMessage(queryClient: QueryClient, conversationId: string, clientMsgId: string) {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages(conversationId), (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((p) => ({ ...p, items: p.items.filter((m) => m.clientMsgId !== clientMsgId) })),
        }
      : data,
  );
}

/**
 * Routes one socket event into the cache, where the screens already look.
 * Every step is safe to repeat: the same event heard twice (two screens
 * listening, or an event that also came back as a send's answer) changes
 * nothing the second time.
 */
export function applyChatEvent(queryClient: QueryClient, event: ChatEvent) {
  switch (event.type) {
    case 'message': {
      putMessage(queryClient, event.message);
      // The list's order, last line and unread counts all move; only lists on screen refetch.
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      return;
    }
    case 'read': {
      queryClient.setQueryData<ChatThreadDetail>(chatKeys.thread(event.conversationId), (t) =>
        t ? { ...t, members: withReadMark(t.members, event.userId, event.messageId) } : t,
      );
      // You, reading on another device: the list's unread count changes.
      if (queryClient.getQueryData<string>(chatKeys.me) === event.userId) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      }
      return;
    }
    case 'typing': {
      queryClient.setQueryData<TypingState>(chatKeys.typing(event.conversationId), (s) => ({
        ...s,
        [event.userId]: Date.now() + TYPING_SHOWN_MS,
      }));
      return;
    }
    case 'reconnected': {
      // Whatever happened while the connection was down is fetched afresh.
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadDetails });
      void queryClient.invalidateQueries({ queryKey: chatKeys.messageLists });
      return;
    }
  }
}
