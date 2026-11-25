import type { TripsRequest } from './data/datasources/remote/tripsApi';
import { createTripsRepository } from './data/repositories/TripsRepositoryImpl';
import {
  makeLoadGoing,
  makeLoadHostedUpcoming,
  makeLoadMyPosts,
  makeLoadPast,
  makeLoadTravellerFaces,
  makeLoadWaiting,
} from './domain/usecases/TripsUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createTripsUseCases(request: TripsRequest) {
  const repo = createTripsRepository(request);
  return {
    loadGoing: makeLoadGoing(repo),
    loadHostedUpcoming: makeLoadHostedUpcoming(repo),
    loadMyPosts: makeLoadMyPosts(repo),
    loadWaiting: makeLoadWaiting(repo),
    loadPast: makeLoadPast(repo),
    loadTravellerFaces: makeLoadTravellerFaces(repo),
  };
}

export type TripsUseCases = ReturnType<typeof createTripsUseCases>;
