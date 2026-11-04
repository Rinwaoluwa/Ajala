import type { TripsRequest } from './data/datasources/remote/tripsApi';
import { createTripsRepository } from './data/repositories/TripsRepositoryImpl';
import { makeLoadPast, makeLoadUpcoming } from './domain/usecases/TripsUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createTripsUseCases(request: TripsRequest) {
  const repo = createTripsRepository(request);
  return {
    loadUpcoming: makeLoadUpcoming(repo),
    loadPast: makeLoadPast(repo),
  };
}

export type TripsUseCases = ReturnType<typeof createTripsUseCases>;
