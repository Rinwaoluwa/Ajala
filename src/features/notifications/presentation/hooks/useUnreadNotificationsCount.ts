import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useInboxQuery } from './useInbox';

/**
 * The inbox's unread count for a badge (the Home bell), from the first page of
 * the All list: the same cache the Notifications screen reads and marks, so
 * reading there lowers the badge at once. It is asked again whenever the
 * screen showing it comes back into view, since pushes may have arrived.
 */
export function useUnreadNotificationsCount(): number {
  const query = useInboxQuery(false);
  const { refetch } = query;
  // The first focus comes with the first load; asking again then would be a second request.
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void refetch();
      seen.current = true;
    }, [refetch]),
  );
  return query.data?.pages[0]?.unreadCount ?? 0;
}
