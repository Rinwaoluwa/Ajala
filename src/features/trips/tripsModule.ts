import type { TripsRequest } from './data/datasources/remote/tripsApi';
import { createTripsRepository } from './data/repositories/TripsRepositoryImpl';
import {
  makeLoadGoing,
  makeLoadHostedUpcoming,
  makeLoadPast,
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
    loadWaiting: makeLoadWaiting(repo),
    loadPast: makeLoadPast(repo),
  };
}

export type TripsUseCases = ReturnType<typeof createTripsUseCases>;
