import { getClientLocationHeader } from '@core/location/deviceLocation';

import type { FeedRepository } from '../../domain/repositories/FeedRepository';
import { createFeedApi, type FeedRequest } from '../datasources/remote/feedApi';
import { toCatalogCity, toFeedError, toFeedPage } from '../mappers/feedMappers';

/**
 * `FeedRepository` over the API. Every page sends `X-Client-Location` when the
 * phone can give it (spec §2.11), so the feed follows the person and cards say
 * how far away they are.
 *
 * Cache policy: none on the phone. The server caches cards for 10 minutes;
 * pull to refresh asks again from the first page.
 */
export function createFeedRepository(request: FeedRequest): FeedRepository {
  const api = createFeedApi(request);
  return {
    async getFeed(filter, cursor, limit) {
      try {
        return toFeedPage(await api.getFeed(filter, cursor, limit, await getClientLocationHeader()));
      } catch (e) {
        throw toFeedError(e);
      }
    },
    async searchCities(query, limit) {
      try {
        return (await api.searchCities(query, limit)).map(toCatalogCity);
      } catch (e) {
        throw toFeedError(e);
      }
    },
  };
}
