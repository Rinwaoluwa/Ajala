import { getClientLocationHeader } from '@core/location/deviceLocation';

import type { FeedRepository } from '../../domain/repositories/FeedRepository';
import { createFeedApi, type FeedRequest } from '../datasources/remote/feedApi';
import { toCatalogCity, toFeedError, toFeedPage } from '../mappers/feedMappers';

/**
 * `FeedRepository` over the API. Every page sends `X-Client-Location` when the
 * phone can give it (spec §2.11), so the feed follows the person and cards say
 * how far away they are. A teleport outranks the header on the server, so it
 * is still sent while teleported: cards keep their real distance from the phone.
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
      throw toFeedError(e, context);
    }
  };

  return {
    getFeed: (filter, cursor, limit) =>
      guard(async () => toFeedPage(await api.getFeed(filter, cursor, limit, await getClientLocationHeader()))),
    searchCities: (query, limit) => guard(async () => (await api.searchCities(query, limit)).map(toCatalogCity)),
    popularCities: () => guard(async () => (await api.popularCities()).map(toCatalogCity)),
    teleport: (cityId) => guard(() => api.teleport({ cityId }), 'teleport'),
    returnHome: () => guard(() => api.returnHome()),
  };
}
