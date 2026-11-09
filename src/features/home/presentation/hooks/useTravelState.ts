import { useQuery } from '@tanstack/react-query';

import type { TravelState } from '../../domain/entities/Feed';
import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * Where Travel stands, from `GET /me`: the teleport in force (by place id) and
 * the person's home place. The server holds both, so they are known straight
 * after a restart, before the feed has answered.
 *
 * Kept fresh by `useTravelMove`, which writes the new teleport into this cache
 * as soon as a move lands, so the header and Travel never show the old place
 * while `/me` is asked again.
 *
 * `null` until the first answer (or when it fails); callers fall back to what
 * the feed says.
 */
export function useTravelState(): TravelState | null {
  const { loadTravelState } = useHomeUseCases();
  const query = useQuery({ queryKey: feedKeys.travelState, queryFn: () => loadTravelState() });
  return query.data ?? null;
}
