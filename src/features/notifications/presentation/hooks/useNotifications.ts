import { useMemo, useState } from 'react';

import type { AppNotification, NotificationFilter } from '../../domain/entities/Notification';
import { isNotificationsError, type NotificationsErrorCode } from '../../domain/entities/NotificationsError';
import { useInboxQuery, useMarkRead } from './useInbox';

/**
 * View model for the Notifications list: All or Unread (filtered by the
 * server, each its own cached list), newest first as the server sends them,
 * paged as the person scrolls. Tapping marks read; "mark all" marks the lot.
 */
export function useNotifications() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [pulling, setPulling] = useState(false);
  const query = useInboxQuery(filter === 'unread');
  const mark = useMarkRead();

  const items: AppNotification[] = useMemo(() => {
    // A row can move between pages while the inbox changes; show it once.
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((n) => !seen.has(n.id) && !!seen.add(n.id));
  }, [query.data]);

  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;
  const error: NotificationsErrorCode | null = query.error
    ? isNotificationsError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  return {
    filter,
    setFilter,
    items,
    unreadCount,
    loading: query.isPending,
    // A list that loaded keeps showing when a later refresh fails.
    failed: !!error && items.length === 0,
    refreshing: pulling && query.isRefetching,
    loadingMore: query.isFetchingNextPage,
    retry: () => void query.refetch(),
    refresh: () => {
      setPulling(true);
      void query.refetch().finally(() => setPulling(false));
    },
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    /** Marks one read; already-read rows send nothing. */
    markRead: (n: AppNotification) => {
      if (!n.read) mark.mutate(n.id);
    },
    markAllRead: () => mark.mutate(null),
  };
}
