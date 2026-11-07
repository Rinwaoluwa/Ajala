import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CatalogCity } from '../../domain/entities/Feed';
import { isFeedError, type FeedErrorCode } from '../../domain/entities/FeedError';
import { CITY_BOUND_KEYS } from '../state/feedQueries';
import { travelMemory } from '../state/travelMemory';
import { useHomeUseCases } from '../state/useHomeUseCases';

export type TravelMove = { kind: 'teleport'; city: CatalogCity } | { kind: 'returnHome' };

/**
 * Teleporting (`POST /me/teleport { cityId }`) and coming home
 * (`DELETE /me/teleport`), spec §2.19. Both answer 204; the server then picks
 * that city for the feed, the map and search until the person comes home or
 * the subscription ends.
 *
 * Not optimistic: the city is the server's to choose, so nothing changes on
 * screen until it has said yes. Then every city-bound cache is reset — not just
 * marked stale — so no screen can show the old city's cards while the new
 * ones load.
 *
 * A 402 (`paymentRequired`) means Travel is not on, or has lapsed: the caller
 * opens the paywall.
 */
export function useTravelMove() {
  const { teleport, returnHome } = useHomeUseCases();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (move: TravelMove) => (move.kind === 'teleport' ? teleport(move.city.id) : returnHome()),
    onSuccess: (_answer, move) => {
      if (move.kind === 'teleport') travelMemory.addRecent(move.city);
      // Not awaited: the caller closes Travel now, and the feed draws its skeleton until the new city lands.
      for (const queryKey of CITY_BOUND_KEYS) void queryClient.resetQueries({ queryKey: [...queryKey] });
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
