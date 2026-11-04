import { getClientLocationHeader } from '@core/location/deviceLocation';
import { bboxParam } from '@core/maps/geo';

import type { ExploreRepository } from '../../domain/repositories/ExploreRepository';
import { rsvpNoticeStore, type RsvpNoticeStore } from '../datasources/local/rsvpNoticeStore';
import { createExploreApi, type ExploreRequest } from '../datasources/remote/exploreApi';
import {
  toExploreError,
  toInterest,
  toMapPins,
  toMeetupsPage,
  toPlaceResult,
  toPostPreview,
  toRsvpResult,
} from '../mappers/exploreMappers';

/**
 * `ExploreRepository` over the API and the phone. Pins, posts and meetups send
 * `X-Client-Location` when the phone can give it (spec §2.11): it picks the city
 * the pins come from and fills each card's distance.
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
      throw toExploreError(e, context);
    }
  };

  return {
    getPins: (bbox, type) =>
      guard(async () => toMapPins(await api.getPins(bboxParam(bbox), type, await getClientLocationHeader()))),
    getPost: (postId) =>
      guard(async () => toPostPreview(await api.getPost(postId, await getClientLocationHeader()))),
    rsvp: (postId) => guard(async () => toRsvpResult(await api.rsvp(postId))),
    recordLinkClick: (postId) => guard(() => api.linkClick(postId)),
    report: (postId, reason, details) =>
      guard(async () => {
        await api.report(postId, { reason, details });
      }, 'report'),
    listInterests: () => guard(async () => (await api.listInterests()).map(toInterest)),
    getMeetups: (interestId, cursor, limit) =>
      guard(async () =>
        toMeetupsPage(await api.getMeetups(interestId, cursor, limit, await getClientLocationHeader())),
      ),
    searchPlaces: (q, limit) => guard(async () => (await api.searchCities(q, limit)).map(toPlaceResult)),
    hasSeenRsvpNotice: () => notice.seen(),
    markRsvpNoticeSeen: () => notice.markSeen(),
  };
}
