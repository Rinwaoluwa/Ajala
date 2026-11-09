import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TravelCity, TravelState } from '../../domain/entities/Feed';
import { isFeedError, type FeedErrorCode } from '../../domain/entities/FeedError';
import { ORIGIN_BOUND_KEYS, feedKeys } from '../state/feedQueries';
import { travelMemory } from '../state/travelMemory';
import { useHomeUseCases } from '../state/useHomeUseCases';

export type TravelMove = { kind: 'teleport'; city: TravelCity } | { kind: 'returnHome' };

/**
 * Teleporting (`POST /me/teleport { placeId }`) and coming home
 * (`DELETE /me/teleport`), spec §2.19. Both answer 204; the server then looks
 * around that city for the feed, the map and search until the person comes
 * home or the subscription ends.
 *
 * Not optimistic: the place is the server's to accept, so nothing changes on
 * screen until it has said yes. Then every origin-bound cache is reset — not
 * just marked stale — so no screen can show the old place's cards while the
 * new ones load. The teleport Travel reads from `GET /me` (`useTravelState`)
 * is written straight away too, then asked for again, and the city's name is
 * put in the place-name cache, so the header can say "Teleported to Accra"
 * without a place lookup while the feed reloads.
 *
 * A 402 (`paymentRequired`) means Travel is not on, or has lapsed: the caller
 * opens the paywall.
 */
export function useTravelMove() {
  const { teleport, returnHome } = useHomeUseCases();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (move: TravelMove) => (move.kind === 'teleport' ? teleport(move.city.placeId) : returnHome()),
    onSuccess: (_answer, move) => {
      if (move.kind === 'teleport') {
        travelMemory.addRecent(move.city);
        queryClient.setQueryData(feedKeys.placeName(move.city.placeId), move.city.name);
      }
      queryClient.setQueryData<TravelState>(feedKeys.travelState, (state) =>
        state
          ? { ...state, teleport: move.kind === 'teleport' ? { placeId: move.city.placeId } : null }
          : state,
      );
      void queryClient.invalidateQueries({ queryKey: feedKeys.travelState });
      // Not awaited: the caller closes Travel now, and the feed draws its skeleton until the new place lands.
      for (const queryKey of ORIGIN_BOUND_KEYS) void queryClient.resetQueries({ queryKey: [...queryKey] });
    },
  });

  const error: FeedErrorCode | null = mutation.error
    ? isFeedError(mutation.error)
      ? mutation.error.code
      : 'unknown'
    : null;

  return {
    move: mutation.mutateAsync,
    /** The move in flight, so the screen can mark the city being moved to. */
    pending: mutation.isPending ? mutation.variables : null,
    error,
    reset: mutation.reset,
  };
}
