import { createExploreRepository } from './data/repositories/ExploreRepositoryImpl';
import type { ExploreRequest } from './data/datasources/remote/exploreApi';
import {
  makeEndPlaceSearch,
  makeGetMyId,
  makeJoin,
  makeListInterests,
  makeLoadMeetups,
  makeLoadPins,
  makeLoadPost,
  makePlaceLocation,
  makeRecordLinkClick,
  makeReportPost,
  makeRsvpNotice,
  makeSearchPlaces,
  makeSearchPosts,
} from './domain/usecases/ExploreUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createExploreUseCases(request: ExploreRequest) {
  const repo = createExploreRepository(request);
  return {
    loadPins: makeLoadPins(repo),
    loadPost: makeLoadPost(repo),
    join: makeJoin(repo),
    recordLinkClick: makeRecordLinkClick(repo),
    getMyId: makeGetMyId(repo),
    reportPost: makeReportPost(repo),
    listInterests: makeListInterests(repo),
    loadMeetups: makeLoadMeetups(repo),
    searchPlaces: makeSearchPlaces(repo),
    placeLocation: makePlaceLocation(repo),
    endPlaceSearch: makeEndPlaceSearch(repo),
    searchPosts: makeSearchPosts(repo),
    rsvpNotice: makeRsvpNotice(repo),
  };
}

export type ExploreUseCases = ReturnType<typeof createExploreUseCases>;
