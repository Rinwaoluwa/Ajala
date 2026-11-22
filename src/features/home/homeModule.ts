import { hiddenPostsStore, likedPostsStore } from './data/datasources/local/postListStores';
import { createFeedRepository } from './data/repositories/FeedRepositoryImpl';
import type { FeedRequest } from './data/datasources/remote/feedApi';
import {
  makeEndCitySearch,
  makeLoadFeed,
  makeLoadPostCommentCount,
  makeLoadPostDescription,
  makeLoadTravelState,
  makeCityNameAt,
  makePlaceName,
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
    loadPostDescription: makeLoadPostDescription(repo),
    loadPostCommentCount: makeLoadPostCommentCount(repo),
    searchCities: makeSearchCities(repo),
    placeName: makePlaceName(repo),
    cityNameAt: makeCityNameAt(repo),
    endCitySearch: makeEndCitySearch(repo),
    teleport: makeTeleport(repo),
    returnHome: makeReturnHome(repo),
    loadTravelState: makeLoadTravelState(repo),
    /** "Hide post" and the heart, remembered on this phone (there are no endpoints yet). */
    hiddenPosts: hiddenPostsStore,
    likedPosts: likedPostsStore,
  };
}

export type HomeUseCases = ReturnType<typeof createHomeUseCases>;
