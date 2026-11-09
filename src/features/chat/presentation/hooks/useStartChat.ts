import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { isChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import { dropPostThreads } from '../state/chatCache';
import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * Opens a chat from elsewhere (`POST /conversations`): with a person
 * (`userId`) or a post's group (`postId`). For a person the API answers with
 * the existing conversation when there is one, so this is safe to call every
 * time someone taps Message. For a post it only finds the group chat you are
 * in: 409 `GROUP_CHAT_FULL` while you wait for a place, 404 when it isn't there
 * for you (left, removed, or the post was cancelled), and then any copy of it
 * in the lists is dropped.
 *
 * It starts by itself on arrival. The answer is the full conversation, so it
 * goes straight into the cache and the thread opens without a second fetch;
 * `onStarted` then replaces this screen with the thread.
 */
export function useStartChat(
  target: { userId?: string; postId?: string },
  onStarted: (conversationId: string) => void,
) {
  const { startThread } = useChatUseCases();
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: () => startThread(target),
    onSuccess: (thread) => {
      queryClient.setQueryData(chatKeys.thread(thread.id), thread);
      void queryClient.invalidateQueries({ queryKey: chatKeys.threadLists });
      onStarted(thread.id);
    },
    onError: (e) => {
      if (target.postId && isChatError(e) && e.code === 'notFound') dropPostThreads(queryClient, target.postId);
    },
  });

  const { mutate } = start;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  const error: ChatErrorCode | null = start.error
    ? isChatError(start.error)
      ? start.error.code
      : 'unknown'
    : null;

  return {
    /** Until there is an answer, including the moment before the first call goes. */
    loading: !error,
    error,
    retry: () => mutate(),
  };
}
