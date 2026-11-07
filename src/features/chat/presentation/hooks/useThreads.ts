import { keepPreviousData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import type { ChatFilter, ChatThread, ChatThreadDetail } from '../../domain/entities/Chat';
import { isChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import { previewLine, threadAvatar, threadName } from '../../domain/rules/chatRules';
import { chatCopy } from '../copy';
import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';
import { useChatRealtime } from './useChatRealtime';
import { useMyId } from './useMyId';

export type ThreadRowModel = {
  thread: ChatThread;
  name: string;
  avatarUrl: string | null;
  preview: string;
};

/**
 * View model for the Messages list (`GET /conversations`): the conversations
 * for a tab (All / Unread / Groups) and a search, latest activity first, paged.
 *
 * The search goes out when typing pauses (250ms) and is cached per text, so
 * going back over the same letters answers at once. The live socket is held
 * while the list is open, so new messages reorder it.
 *
 * A group's last line names its sender by id only. The name is looked up among
 * the members of that conversation when it has been opened (its detail is in
 * the cache); otherwise the line shows without a name.
 */
export function useThreads() {
  const { listThreads } = useChatUseCases();
  const queryClient = useQueryClient();
  const myId = useMyId();
  useChatRealtime();
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [search, setSearch] = useState('');
  // Remounting the uncontrolled search field is how it is cleared.
  const [searchKey, setSearchKey] = useState(0);
  const q = useDebouncedValue(search.trim(), 250);
  const [pulling, setPulling] = useState(false);

  const list = useInfiniteQuery({
    queryKey: chatKeys.threads(filter, q),
    queryFn: ({ pageParam }) => listThreads(filter, q, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = useMemo<ThreadRowModel[]>(() => {
    const senderName = (threadId: string) => (userId: string) =>
      queryClient
        .getQueryData<ChatThreadDetail>(chatKeys.thread(threadId))
        ?.members.find((m) => m.person.id === userId)?.person.name ?? null;
    return (list.data?.pages ?? [])
      .flatMap((p) => p.items)
      .map((thread) => ({
        thread,
        name: threadName(thread, chatCopy.groupFallback),
        avatarUrl: threadAvatar(thread),
        preview: previewLine(thread, {
          myId,
          senderName: senderName(thread.id),
          you: chatCopy.you,
          photos: chatCopy.photos,
        }),
      }));
  }, [list.data, myId, queryClient]);

  const error: ChatErrorCode | null = list.error
    ? isChatError(list.error)
      ? list.error.code
      : 'unknown'
    : null;

  const clearSearch = useCallback(() => {
    setSearch('');
    setSearchKey((k) => k + 1);
  }, []);

  return {
    filter,
    setFilter,
    search,
    q,
    setSearch,
    searchKey,
    clearSearch,
    rows,
    loading: list.isPending,
    error,
    refreshing: pulling && list.isRefetching,
    refresh: () => {
      setPulling(true);
      void list.refetch().finally(() => setPulling(false));
    },
    retry: () => void list.refetch(),
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },
  };
}
