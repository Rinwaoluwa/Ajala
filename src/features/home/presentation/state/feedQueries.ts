import type { FeedFilter } from '../../domain/entities/Feed';

/** The home feature's TanStack Query keys. */
export const feedKeys = {
  /** Every filter's feed. */
  lists: ['feed', 'list'] as const,
  /** One feed per filter. The server picks the city, so the city is not part of the key. */
  feed: (filter: FeedFilter) => ['feed', 'list', filter] as const,
  /** Under `feed`, not shared: another feature maps `/cities` to a different shape. */
  cities: (query: string) => ['feed', 'cities', query] as const,
  popularCities: ['popularCities'] as const,
};

/**
 * Every cached answer that depends on the city the server picks, by the
 * spec's key prefixes (§7.4): `feed` (Home, and Explore's meetup list),
 * `mapPins` and `searchPosts`. A teleport or coming home throws them all away.
 * Explore keys its city-bound queries under the same prefixes for this reason.
 */
export const CITY_BOUND_KEYS = [['feed'], ['mapPins'], ['searchPosts']] as const;
