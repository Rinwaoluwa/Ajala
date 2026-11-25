import { useQuery } from '@tanstack/react-query';

import type { TripFace } from '../../domain/entities/Trip';
import { tripsKeys } from '../state/tripsQueries';
import { useTripsUseCases } from '../state/useTripsUseCases';

const NONE: readonly TripFace[] = [];

/**
 * The first few people going to a trip, for the faces beside its count
 * (`TravellerDots`). A list card carries how many are going but not who
 * (backend request B18), so a card on screen asks the post's attendees for
 * them, once per post (five minutes fresh; joining or leaving refreshes it with
 * the rest of Trips).
 *
 * Empty until known, and when the list may not be read (a private post the
 * reader is still waiting to get into): the card then keeps its plain circles.
 * Not tried again on a refusal.
 */
export function useTravellerFaces(postId: string, enabled: boolean): readonly TripFace[] {
  const { loadTravellerFaces } = useTripsUseCases();
  const query = useQuery({
    queryKey: tripsKeys.faces(postId),
    queryFn: () => loadTravellerFaces(postId),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return query.data ?? NONE;
}
