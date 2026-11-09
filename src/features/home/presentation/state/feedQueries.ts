import type { FeedFilter } from '../../domain/entities/Feed';

/** The home feature's TanStack Query keys. */
export const feedKeys = {
  /** Every filter's feed. */
  lists: ['feed', 'list'] as const,
  /** One feed per filter. The server picks the point it looks around, so no place is part of the key. */
  feed: (filter: FeedFilter) => ['feed', 'list', filter] as const,
  /**
   * Travel's city search, by what was typed. Under `home`, not `feed`: a
   * teleport resets `feed`, and the answers to a search don't change with it.
   */
  cities: (query: string) => ['home', 'cities', query] as const,
  /** A place's name by id, for a teleport `GET /me` knows only by id. Names don't change. */
  placeName: (placeId: string) => ['home', 'placeName', placeId] as const,
  /**
   * Travel's view of `GET /me` (the teleport and the home place). Home's own key
   * and shape: the shared `['me']` cache holds the profile feature's shape.
   */
  travelState: ['home', 'travelState'] as const,
};

/**
 * Every cached answer that depends on where the server looks, by the spec's
 * key prefixes (§7.4): `feed` (Home, and Explore's meetup list), `mapPins` and
 * `searchPosts`. A teleport or coming home throws them all away. Explore keys
 * its origin-bound queries under the same prefixes for this reason.
 */
export const ORIGIN_BOUND_KEYS = [['feed'], ['mapPins'], ['searchPosts']] as const;
