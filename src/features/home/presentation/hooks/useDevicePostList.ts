import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import type { PostListStore } from '../../domain/repositories/PostListStore';

const NONE: readonly string[] = [];

/**
 * One of the lists of posts kept on this phone (`PostListStore`: hidden,
 * liked), as a cached query: read once per account, changed at once on screen,
 * and saved behind the change.
 *
 * Until the account is known (`userId` null) nothing is read or saved, and a
 * change lasts for the visit.
 */
export function useDevicePostList(store: PostListStore, key: readonly unknown[], userId: string | null) {
  const queryClient = useQueryClient();
  const saved = useQuery({
    queryKey: key,
    queryFn: () => store.list(userId!),
    enabled: userId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const { mutate } = useMutation({
    mutationFn: (ids: readonly string[]) => (userId ? store.save(userId, ids) : Promise.resolve()),
  });
  // The key is rebuilt each render from the same parts. `change` reads the latest one, so it
  // stays the same function and the posts that hold it are not redrawn.
  const latestKey = useRef(key);
  useEffect(() => {
    latestKey.current = key;
  });
  const change = useCallback(
    (to: (ids: readonly string[]) => readonly string[]) => {
      const at = latestKey.current;
      const next = to(queryClient.getQueryData<readonly string[]>(at) ?? NONE);
      queryClient.setQueryData(at, next);
      mutate(next);
    },
    [queryClient, mutate],
  );
  return { ids: saved.data ?? NONE, change };
}
