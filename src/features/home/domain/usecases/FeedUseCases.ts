import type { CatalogCity, FeedFilter } from '../entities/Feed';
import type { FeedRepository } from '../repositories/FeedRepository';
import { FEED_PAGE_SIZE } from '../rules/feedRules';

/** A page of the feed: the first with no cursor (also pull to refresh), then `nextCursor`. */
export const makeLoadFeed =
  (repo: FeedRepository) =>
  (filter: FeedFilter, cursor: string | null = null) =>
    repo.getFeed(filter, cursor, FEED_PAGE_SIZE);

/** Travel's city search, from two characters. */
export const makeSearchCities =
  (repo: FeedRepository) =>
  async (query: string): Promise<CatalogCity[]> => {
    const q = query.trim();
    return q.length < 2 ? [] : repo.searchCities(q, 10);
  };

/** Travel's "Popular" row (`GET /cities/popular`). */
export const makePopularCities = (repo: FeedRepository) => () => repo.popularCities();

/** Moves the feed, map and search to a city (`POST /me/teleport`). */
export const makeTeleport = (repo: FeedRepository) => (cityId: string) => repo.teleport(cityId);

/** Back to the city the server would pick without a teleport (`DELETE /me/teleport`). */
export const makeReturnHome = (repo: FeedRepository) => () => repo.returnHome();
