import { useQuery } from '@tanstack/react-query';

import { chatKeys } from '../state/chatQueries';
import { useChatUseCases } from '../state/useChatUseCases';

/**
 * The signed-in person's id. A group's list preview names its sender by id
 * only, so this is how "You: …" is told apart. It never changes within a
 * session, and signing out clears the cache.
 */
export function useMyId(): string | null {
  const { getMyId } = useChatUseCases();
  const me = useQuery({ queryKey: chatKeys.me, queryFn: () => getMyId(), staleTime: Infinity });
  return me.data ?? null;
}
