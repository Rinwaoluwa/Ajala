import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMyUserId } from '@features/auth';

import type {
  ChatMessage,
  ChatThreadDetail,
  LocalImage,
  MessageDraft,
  MessagesPage,
  ReportReason,
} from '../../domain/entities/Chat';
import { isChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import {
  TYPING_INTERVAL_MS,
  conversationItems,
  draftProblem,
  isLaterId,
  messageStatus,
  myIdFrom,
  newestConfirmed,
  threadAvatar,
  threadName,
} from '../../domain/rules/chatRules';
import { chatCopy } from '../copy';
import { dropMessage, dropThread, putMessage } from '../state/chatCache';
import { chatKeys, type TypingState } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

const errorCode = (e: unknown): ChatErrorCode => (isChatError(e) ? e.code : 'unknown');

const sameImages = (a: readonly LocalImage[], b: readonly LocalImage[]) =>
  a.length === b.length && a.every((image, i) => image.uri === b[i]?.uri);

/**
 * View model for one conversation (Figma Chat 1:1 / Chat group): the thread
 * (`GET /conversations/{id}`), its messages oldest first with day dividers and
 * the activity card, who is typing, and sending.
 *
 * - **Messages** page newest first (an infinite query, `before` = the oldest id
 *   held); older pages load as the person scrolls up. They are fetched again
 *   whenever the screen comes back into focus: the socket is best effort, and
 *   picture links only last an hour.
 * - **Sending** is a mutation that shows the message at once, dimmed, keyed by
 *   its `clientMsgId`, then swaps in the server's copy. If it fails the message
 *   is taken back and the composer keeps the words; sending the same words and
 *   pictures again reuses the same `clientMsgId`, so a send that did land is not
 *   posted twice.
 * - **Read**: while the screen is in focus, the newest confirmed message is
 *   marked read (`POST …/read { messageId }`), only ever moving forward.
 * - **Sent / Read** under your messages comes from the other members'
 *   `lastReadMessageId`, kept current by the socket's `read.update`.
 * - **The activity card** is the thread's own `post` (null: no card).
 * - **Gone**: a 404 from the thread, its messages, a send or a read mark means
 *   the chat is no longer there for you (you left or were removed, or the post
 *   was cancelled). It is dropped from the lists, nothing is fetched for it
 *   again, and `gone` tells the screen to say so and leave.
 */
export function useConversation(threadId: string) {
  const uc = useChatUseCases();
  const queryClient = useQueryClient();
  const focused = useIsFocused();
  const messagesKey = chatKeys.messages(threadId);
  // A send or read mark that answered 404; a fetch's own 404 is read from its query below.
  const [goneByCall, setGoneByCall] = useState(false);
  const markGone = useCallback((e: unknown) => {
    if (errorCode(e) === 'notFound') setGoneByCall(true);
  }, []);

  const thread = useQuery({
    queryKey: chatKeys.thread(threadId),
    queryFn: () => uc.getThread(threadId),
    staleTime: 15_000,
    enabled: !goneByCall,
  });

  const messages = useInfiniteQuery({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => uc.getMessages(threadId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 10_000,
    enabled: !goneByCall,
  });

  const gone =
    goneByCall || errorCode(thread.error) === 'notFound' || errorCode(messages.error) === 'notFound';
  useEffect(() => {
    if (gone) dropThread(queryClient, threadId);
  }, [gone, queryClient, threadId]);

  // Back in focus (returning from a post, or to the app): fetch both again. The
  // first focus is the mount, which already fetches.
  const { refetch: refetchThread } = thread;
  const { refetch: refetchMessages } = messages;
  const focusedBefore = useRef(false);
  // A chat that is gone is not asked for again (it would only answer 404 once more).
  const goneRef = useRef(gone);
  useEffect(() => {
    goneRef.current = gone;
  }, [gone]);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current && !goneRef.current) {
        void refetchThread();
        void refetchMessages();
      }
      focusedBefore.current = true;
    }, [refetchThread, refetchMessages]),
  );

  // ---- read ----
  const newestFirst = useMemo(() => (messages.data?.pages ?? []).flatMap((p) => p.items), [messages.data]);
  const newest = newestConfirmed(newestFirst);
  // Who you are: from auth, or failing that from your own messages. Enough to
  // leave out your own typing signal and to draw a message being sent as yours.
  const myUserId = useMyUserId();
  const myIdFromMessages = useMemo(() => myIdFrom(newestFirst), [newestFirst]);
  const myId = myUserId ?? myIdFromMessages;
  const markedUpTo = useRef<string | null>(null);
  const { mutate: markRead } = useMutation({
    mutationFn: (messageId: string) => uc.markRead(threadId, messageId),
    onSuccess: () => {
      queryClient.setQueryData<ChatThreadDetail>(chatKeys.thread(threadId), (t) =>
        t ? { ...t, unreadCount: 0 } : t,
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount });
    },
    onError: (e) => {
      // Try again with the next message, or the next visit.
      markedUpTo.current = null;
      markGone(e);
    },
  });
  const unread = thread.data?.unreadCount ?? 0;
  const newestId = newest?.id ?? null;
  const newestMine = newest?.mine ?? false;
  useEffect(() => {
    if (gone || !focused || !newestId || !isLaterId(newestId, markedUpTo.current)) return;
    // Your own message needs no read mark unless the server still counts something unread.
    if (newestMine && unread === 0) return;
    markedUpTo.current = newestId;
    markRead(newestId);
  }, [gone, focused, newestId, newestMine, unread, markRead]);

  // ---- typing ----
  const typing = useQuery<TypingState>({
    queryKey: chatKeys.typing(threadId),
    queryFn: () => ({}),
    staleTime: Infinity,
  });
  const [now, setNow] = useState(() => Date.now());
  const typers = useMemo(() => {
    const until = typing.data ?? {};
    const ids = Object.keys(until).filter((id) => id !== myId && (until[id] ?? 0) > now);
    const members = thread.data?.members ?? [];
    return ids.map((id) => members.find((m) => m.person.id === id)?.person.name ?? '').filter(Boolean);
  }, [typing.data, myId, now, thread.data?.members]);
  useEffect(() => {
    // Look again straight away (a new signal shows at once) and as each one runs
    // out (so "typing…" goes on time).
    const tick = () => setNow(Date.now());
    const timers = [
      setTimeout(tick, 0),
      ...Object.values(typing.data ?? {}).map((end) => setTimeout(tick, Math.max(0, end - Date.now()) + 50)),
    ];
    return () => timers.forEach(clearTimeout);
  }, [typing.data]);

  const lastTyping = useRef(0);
  const { sendTyping } = uc;
  const onTyping = useCallback(() => {
    const t = Date.now();
    if (t - lastTyping.current < TYPING_INTERVAL_MS) return;
    lastTyping.current = t;
    // Purely a courtesy to the others: a failure is not worth a word.
    void sendTyping(threadId).catch(() => undefined);
  }, [sendTyping, threadId]);

  // ---- send ----
  const failedDraft = useRef<MessageDraft | null>(null);
  const me = thread.data?.members.find((m) => m.person.id === myId)?.person;
  const send = useMutation({
    mutationFn: (draft: MessageDraft) => uc.sendMessage(threadId, draft),
    onMutate: async (draft) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const pending: ChatMessage = {
        id: draft.clientMsgId,
        clientMsgId: draft.clientMsgId,
        conversationId: threadId,
        sender: me ?? { id: myId ?? 'me', name: chatCopy.you, avatarUrl: null, verified: false },
        mine: true,
        body: draft.body || null,
        images: draft.images.map((i) => ({ thumbUrl: i.uri, url: i.uri })),
        taggedPost: null,
        taggedPostUnavailable: false,
        removed: false,
        sentAt: new Date().toISOString(),
        pending: true,
      };
      if (queryClient.getQueryData<InfiniteData<MessagesPage>>(messagesKey)) putMessage(queryClient, pending);
    },
    onSuccess: (message) => {
      failedDraft.current = null;
      putMessage(queryClient, message);
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
    },
    onError: (e, draft) => {
      failedDraft.current = draft;
      dropMessage(queryClient, threadId, draft.clientMsgId);
      markGone(e);
    },
  });

  /** Resolves with null once sent (the composer can clear), or why it was not. */
  const { prepareMessage } = uc;
  const { mutateAsync } = send;
  const submit = useCallback(
    async (body: string, images: LocalImage[]): Promise<ChatErrorCode | null> => {
      if (draftProblem(body, images.length)) return 'invalid';
      const failed = failedDraft.current;
      const draft =
        failed && failed.body === body.trim() && sameImages(failed.images, images)
          ? failed
          : prepareMessage(body, images);
      try {
        await mutateAsync(draft);
        return null;
      } catch (e) {
        return errorCode(e);
      }
    },
    [prepareMessage, mutateAsync],
  );

  // ---- report ----
  const report = useMutation({
    mutationFn: (input: { messageId: string; reason: ReportReason; details: string }) =>
      uc.reportMessage(threadId, input.messageId, input.reason, input.details),
  });

  const { pickPhotos } = uc;

  const oldestFirst = useMemo(() => [...newestFirst].reverse(), [newestFirst]);
  const post = thread.data?.post ?? null;
  const items = useMemo(
    () =>
      conversationItems(oldestFirst, {
        group: thread.data?.kind === 'group',
        hasPost: !!post,
      }),
    [oldestFirst, thread.data?.kind, post],
  );
  const members = thread.data?.members;
  const statusOf = useCallback(
    (message: ChatMessage) => messageStatus(message, members ?? []),
    [members],
  );

  const failure = thread.error ?? messages.error;
  return {
    thread: thread.data ?? null,
    name: thread.data ? threadName(thread.data, chatCopy.groupFallback) : '',
    avatarUrl: thread.data ? threadAvatar(thread.data) : null,
    post,
    items,
    gone,
    statusOf,
    typers,
    hasMessages: oldestFirst.length > 0,
    loading: thread.isPending || messages.isPending,
    error: failure ? errorCode(failure) : null,
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
    onTyping,
    pickPhotos,
    report: async (messageId: string, reason: ReportReason, details: string): Promise<ChatErrorCode | null> => {
      try {
        await report.mutateAsync({ messageId, reason, details });
        return null;
      } catch (e) {
        return errorCode(e);
      }
    },
    reporting: report.isPending,
  };
}
