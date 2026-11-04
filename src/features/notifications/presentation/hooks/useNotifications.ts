import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createNotificationsUseCases } from '../../notificationsModule';
import type { NotificationFilter } from '../../domain/entities/Notification';
import { visibleNotifications } from '../../domain/rules/notificationRules';
import { notificationKeys } from '../state/notificationsQueries';

const useCases = createNotificationsUseCases();

/** View model for the Notifications list: the list, All or Unread, newest first. */
export function useNotifications() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const query = useQuery({ queryKey: notificationKeys.list, queryFn: useCases.list });
  const items = useMemo(
    () => (query.data ? visibleNotifications(query.data, filter) : null),
    [query.data, filter],
  );
  return {
    filter,
    setFilter,
    items,
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    refresh: () => void query.refetch(),
  };
}
