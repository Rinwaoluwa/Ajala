import type { CatalogCity, FeedFilter, TravelCity } from '../entities/Feed';
import type { FeedRepository } from '../repositories/FeedRepository';
import { FEED_PAGE_SIZE } from '../rules/feedRules';

/** A page of the feed: the first with no cursor (also pull to refresh), then `nextCursor`. */
export const makeLoadFeed =
  (repo: FeedRepository) =>
  (filter: FeedFilter, cursor: string | null = null, travelTo: TravelCity | null = null) =>
    repo.getFeed(filter, cursor, FEED_PAGE_SIZE, travelTo);

/** Travel's city search, from two characters. */
export const makeSearchCities =
  (repo: FeedRepository) =>
  async (query: string): Promise<CatalogCity[]> => {
    const q = query.trim();
    return q.length < 2 ? [] : repo.searchCities(q, 10);
  };
