import { getClientLocationHeader } from '@core/location/deviceLocation';
import { cityAt, endPlacesSession, placeDetails, searchCities } from '@core/places';

import type { FeedRepository } from '../../domain/repositories/FeedRepository';
import { createFeedApi, type FeedRequest } from '../datasources/remote/feedApi';
import { toFeedError, toFeedPage, toTravelCity, toTravelState } from '../mappers/feedMappers';

/** A search the caller cancelled: handed back as it is, so the query layer sees a cancel, not a failure. */
const isAbort = (e: unknown) => (e as { name?: unknown } | null)?.name === 'AbortError';

/**
 * `FeedRepository` over the API and the phone's place search. Every page sends
 * `X-Client-Location` when the phone can give it (spec §2.11), so the feed
 * follows the person and cards say how far away they are. A teleport outranks
 * the header on the server, so it is still sent while teleported: cards keep
 * their real distance from the phone.
 *
 * City search and place names come from `@core/places` (Google, or the demo's
 * own list): the API takes place ids but has no search of its own.
 *
 * Cache policy: none on the phone. The server caches cards for 10 minutes;
 * pull to refresh asks again from the first page. Teleport and coming home are
 * writes, never cached or queued: they either land or say why not.
 */
export function createFeedRepository(request: FeedRequest): FeedRepository {
  const api = createFeedApi(request);

  const guard = async <T>(run: () => Promise<T>, context?: 'teleport'): Promise<T> => {
    try {
      return await run();
    } catch (e) {
      if (isAbort(e)) throw e;
      throw toFeedError(e, context);
    }
  };

  return {
    getFeed: (filter, cursor, limit) =>
      guard(async () => toFeedPage(await api.getFeed(filter, cursor, limit, await getClientLocationHeader()))),
    getPostDescription: async (postId) => {
      try {
        return (await api.getPostDescription(postId)).description?.trim() || null;
      } catch {
        // A card without its description is still a card.
        return null;
      }
    },
    searchCities: (query, signal) =>
      guard(async () => (await searchCities(query, null, signal)).map(toTravelCity)),
    cityNameAt: (lat, lng) => guard(async () => (await cityAt(lat, lng))?.name ?? null),
    placeName: (placeId, signal) => guard(async () => (await placeDetails(placeId, signal)).name),
    endCitySearch: () => endPlacesSession(),
    teleport: (placeId) => guard(() => api.teleport({ placeId }), 'teleport'),
    returnHome: () => guard(() => api.returnHome()),
    getTravelState: () => guard(async () => toTravelState(await api.getTravelState())),
  };
}
