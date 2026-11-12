import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type {
  ChatEvent,
  ChatMessage,
  ChatThread,
  ChatThreadDetail,
  MessagesPage,
  ThreadsPage,
} from '../../domain/entities/Chat';
import { TYPING_SHOWN_MS, myIdFrom, upsertNewest, withReadMark } from '../../domain/rules/chatRules';
import { chatKeys, type TypingState } from './chatQueries';

/**
 * Writes into a conversation's cached messages: replaces the copy already held
 * (matched by id or `clientMsgId`, on whichever page it is), or adds it as the
 * newest. A conversation that was never opened has nothing cached and is left
 * alone; it is fetched whole when it opens.
 */
export function putMessage(queryClient: QueryClient, message: ChatMessage, myId: string | null = null) {
  queryClient.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages(message.conversationId), (data) => {
    if (!data) return data;
    const holder = data.pages.findIndex((p) =>
      p.items.some((m) => m.id === message.id || (!!m.clientMsgId && m.clientMsgId === message.clientMsgId)),
    );
    const at = holder === -1 ? 0 : holder;
    return {
      ...data,
      pages: data.pages.map((p, i) => (i === at ? { ...p, items: upsertNewest(p.items, message, myId) } : p)),
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

/** Takes conversations out of every cached list (all tabs, every search). */
function dropFromLists(queryClient: QueryClient, gone: (thread: ChatThread) => boolean) {
  queryClient.setQueriesData<InfiniteData<ThreadsPage>>({ queryKey: chatKeys.threadLists }, (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((t) => !gone(t)) })) }
      : data,
  );
  // Its unread messages no longer count towards the badge.
  void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
}

/**
 * Forgets a conversation the API answered 404 for: you left or were removed,
 * or its post was cancelled or deleted, which removes the chat for everyone.
 * It goes from the lists at once; what was cached for it is dropped once no
 * screen is showing it (the open thread keeps its copy until it is left).
 */
export function dropThread(queryClient: QueryClient, threadId: string) {
  dropFromLists(queryClient, (t) => t.id === threadId);
  for (const key of [chatKeys.thread(threadId), chatKeys.messages(threadId), chatKeys.typing(threadId)]) {
    queryClient.removeQueries({ queryKey: key, type: 'inactive' });
  }
}

/** A post's group chat turned out not to be there for you (404 on opening it): it leaves the lists. */
export function dropPostThreads(queryClient: QueryClient, postId: string) {
  dropFromLists(queryClient, (t) => t.kind === 'group' && t.postId === postId);
}

/** Your id, when one of your messages in this conversation is cached. */
function myIdIn(queryClient: QueryClient, conversationId: string): string | null {
  const data = queryClient.getQueryData<InfiniteData<MessagesPage>>(chatKeys.messages(conversationId));
  return data ? myIdFrom(data.pages.flatMap((p) => p.items)) : null;
}

/**
 * Routes one live event (socket, or a chat push) into the cache, where the screens already look.
 * `myId` is the signed-in person's id (auth's `useMyUserId`), null while unknown:
 * it is how a socket message, which carries no `mine`, is placed on your side.
 * Every step is safe to repeat: the same event heard twice (two screens
 * listening, or an event that also came back as a send's answer, or a message
 * heard on the socket and as a push) changes nothing the second time.
 */
export function applyChatEvent(queryClient: QueryClient, event: ChatEvent, myId: string | null = null) {
  switch (event.type) {
    case 'message': {
      putMessage(queryClient, event.message, myId ?? myIdIn(queryClient, event.message.conversationId));
      // The socket does not know where your phone is, so a tagged post arrives locked even when
      // it is near you (MOB-077). The thread over HTTP, with the location, says whether it is.
      if (event.message.taggedPost?.lockReason) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(event.message.conversationId) });
      }
      // The list's order, last line and unread counts all move, and so may the
      // badge; only what is on screen refetches.
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
      return;
    }
    case 'read': {
      queryClient.setQueryData<ChatThreadDetail>(chatKeys.thread(event.conversationId), (t) =>
        t ? { ...t, members: withReadMark(t.members, event.userId, event.messageId) } : t,
      );
      // You, reading on another device: the list's unread counts and the badge change.
      if ((myId ?? myIdIn(queryClient, event.conversationId)) === event.userId) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
        void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
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
    case 'pushed': {
      // The push names no message, so what is on screen for it is fetched again:
      // the lists, the badge, and the conversation if it is open.
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(event.conversationId) });
      return;
    }
    case 'rsvp': {
      // Not chat's own data, but the socket is chat's. Every feature keys a
      // post's queries with its id (the post page, its attendees, the map's
      // preview), so those are found by the id rather than by importing their
      // keys. A group chat's activity card shows the RSVP too.
      const { postId } = event;
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(postId) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadDetails });
      return;
    }
    case 'reconnected': {
      // Whatever happened while the connection was down is fetched afresh.
      void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadDetails });
      void queryClient.invalidateQueries({ queryKey: chatKeys.messageLists });
      return;
    }
  }
}
