import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * How many conversations have something unread (`GET /conversations/unread-count`),
 * for the badge on Home's chat button. It counts conversations, not messages,
 * as the API does.
 *
 * Asked again whenever the screen showing it comes back into view (Messages may
 * have been read meanwhile), and refetched when a thread is marked read, a
 * message arrives on the socket or a chat push arrives (`chatCache`).
 */
export function useUnreadChatsCount(): number {
  const { getUnreadCount } = useChatUseCases();
  const query = useQuery({
    queryKey: chatKeys.unreadCount,
    queryFn: () => getUnreadCount(),
    staleTime: 15_000,
  });
  const { refetch } = query;
  // The first focus comes with the first load; asking again then would be a second request.
  const seen = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (seen.current) void refetch();
      seen.current = true;
    }, [refetch]),
  );
  return query.data ?? 0;
}
