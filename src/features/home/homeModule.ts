import { createFeedRepository } from './data/repositories/FeedRepositoryImpl';
import type { FeedRequest } from './data/datasources/remote/feedApi';
import {
  makeLoadFeed,
  makePopularCities,
  makeReturnHome,
  makeSearchCities,
  makeTeleport,
} from './domain/usecases/FeedUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createHomeUseCases(request: FeedRequest) {
  const repo = createFeedRepository(request);
  return {
    loadFeed: makeLoadFeed(repo),
    searchCities: makeSearchCities(repo),
    popularCities: makePopularCities(repo),
    teleport: makeTeleport(repo),
    returnHome: makeReturnHome(repo),
  };
}

export type HomeUseCases = ReturnType<typeof createHomeUseCases>;
