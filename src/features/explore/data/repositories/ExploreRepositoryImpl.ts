import { getClientLocationHeader } from '@core/location/deviceLocation';
import { bboxParam } from '@core/maps/geo';
import { endPlacesSession, placeDetails, searchCities } from '@core/places';

import type { ExploreRepository } from '../../domain/repositories/ExploreRepository';
import { rsvpNoticeStore, type RsvpNoticeStore } from '../datasources/local/rsvpNoticeStore';
import { createExploreApi, type ExploreRequest } from '../datasources/remote/exploreApi';
import {
  toExploreError,
  toInterest,
  toMapPins,
  toPlaceResult,
  toPostPreview,
  toPostsPage,
  toRsvpResult,
} from '../mappers/exploreMappers';

/** A search the caller cancelled: handed back as it is, so the query layer sees a cancel, not a failure. */
const isAbort = (e: unknown) => (e as { name?: unknown } | null)?.name === 'AbortError';

/**
 * `ExploreRepository` over the API and the phone. Pins, posts, the feed and
 * search send `X-Client-Location` when the phone can give it (spec §2.11): it
 * is where they look (unless a Travel teleport outranks it) and fills each
 * card's distance. The map's city search is the place search on the phone
 * (`@core/places`): the API takes place ids but has no search of its own.
 *
 * Cache policy: none here; the presentation layer's queries cache.
 */
export function createExploreRepository(
  request: ExploreRequest,
  notice: RsvpNoticeStore = rsvpNoticeStore,
): ExploreRepository {
  const api = createExploreApi(request);

  const guard = async <T>(run: () => Promise<T>, context?: 'report'): Promise<T> => {
    try {
      return await run();
    } catch (e) {
      if (isAbort(e)) throw e;
      throw toExploreError(e, context);
    }
  };

  return {
    getPins: (bbox, type, titleFilter) =>
      guard(async () =>
        toMapPins(await api.getPins(bboxParam(bbox), type, titleFilter, await getClientLocationHeader())),
      ),
    getPost: (postId) =>
      guard(async () => toPostPreview(await api.getPost(postId, await getClientLocationHeader()))),
    rsvp: (postId) => guard(async () => toRsvpResult(await api.rsvp(postId))),
    recordLinkClick: (postId) => guard(() => api.linkClick(postId)),
    getMyId: () => guard(async () => (await api.me()).id),
    report: (postId, reason, details) =>
      guard(async () => {
        await api.report(postId, { reason, details });
      }, 'report'),
    listInterests: () => guard(async () => (await api.listInterests()).map(toInterest)),
    getFeed: (type, cursor, limit) =>
      guard(async () => toPostsPage(await api.getFeed(type, cursor, limit, await getClientLocationHeader()))),
    searchPosts: (search, cursor, limit) =>
      guard(async () =>
        toPostsPage(
          await api.searchPosts(
            { q: search.words, interestIds: search.interestIds, type: search.type },
            cursor,
            limit,
            await getClientLocationHeader(),
          ),
        ),
      ),
    searchPlaces: (q, signal) => guard(async () => (await searchCities(q, null, signal)).map(toPlaceResult)),
    placeLocation: (placeId, signal) =>
      guard(async () => {
        const place = await placeDetails(placeId, signal);
        return { lat: place.lat, lng: place.lng };
      }),
    endPlaceSearch: () => endPlacesSession(),
    hasSeenRsvpNotice: () => notice.seen(),
    markRsvpNoticeSeen: () => notice.markSeen(),
  };
}
