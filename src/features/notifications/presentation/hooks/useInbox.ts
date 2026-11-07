import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import type { NotificationsPage } from '../../domain/entities/Notification';
import { markPagesRead } from '../../domain/rules/notificationRules';
import { notificationKeys } from '../state/notificationsQueries';
import { useNotificationsUseCases } from '../state/useNotificationsUseCases';

/**
 * One server-filtered inbox list (`unread=true|false`), paged by cursor. The
 * screen and the Home badge both use this, so they read the same cache.
 */
export function useInboxQuery(unread: boolean, enabled = true) {
  const { loadInbox } = useNotificationsUseCases();
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox(unread),
    queryFn: ({ pageParam }) => loadInbox(unread, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

type Inbox = InfiniteData<NotificationsPage, string | null>;

/**
 * Marking read, one (`id`) or all (`null`). Both lists and the badge change at
 * once; if the server refuses they go back, and either way they are refetched
 * afterwards so the Unread list drops what is now read.
 */
export function useMarkRead() {
  const { markRead, markAllRead } = useNotificationsUseCases();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | null) => (id ? markRead(id) : markAllRead()),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const before = queryClient.getQueriesData<Inbox>({
        queryKey: notificationKeys.all,
      });
      queryClient.setQueriesData<Inbox>({ queryKey: notificationKeys.all }, (data) =>
        data ? { ...data, pages: markPagesRead(data.pages, id ? [id] : null) } : data,
      );
      return { before };
    },
    onError: (_e, _id, context) => {
      for (const [key, data] of context?.before ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
