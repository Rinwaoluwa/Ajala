import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import type { ChatFilter } from '../../domain/entities/Chat';
import { isChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * View model for the Messages list: the conversations for a filter (All /
 * Unread / Groups) and a search, newest activity first, paged.
 *
 * The search goes out when typing pauses (250ms) and is cached per text, so
 * going back over the same letters answers at once. While chat is not in the
 * API (`unavailable`), the list is the designed empty state.
 */
export function useThreads() {
  const { listThreads } = useChatUseCases();
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

  const threads = useMemo(() => (list.data?.pages ?? []).flatMap((p) => p.items), [list.data]);
  const unavailable = isChatError(list.error) && list.error.code === 'unavailable';
  const error: ChatErrorCode | null =
    list.error && !unavailable ? (isChatError(list.error) ? list.error.code : 'unknown') : null;

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
    threads,
    loading: list.isPending && !unavailable,
    unavailable,
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
