import type { FeedFilter, TravelCity } from '../entities/Feed';
import type { FeedRepository } from '../repositories/FeedRepository';
import { FEED_PAGE_SIZE } from '../rules/feedRules';
import { MIN_CITY_SEARCH } from '../rules/travelRules';

/** A page of the feed: the first with no cursor (also pull to refresh), then `nextCursor`. */
export const makeLoadFeed =
  (repo: FeedRepository) =>
  (filter: FeedFilter, cursor: string | null = null) =>
    repo.getFeed(filter, cursor, FEED_PAGE_SIZE);

/** A card's description, while the feed's cards don't carry one (B4). */
export const makeLoadPostDescription = (repo: FeedRepository) => (postId: string) =>
  repo.getPostDescription(postId);

/** Travel's city search, from two characters; `signal` drops a search typing has overtaken. */
export const makeSearchCities =
  (repo: FeedRepository) =>
  async (query: string, signal?: AbortSignal): Promise<TravelCity[]> => {
    const q = query.trim();
    return q.length < MIN_CITY_SEARCH ? [] : repo.searchCities(q, signal);
  };

/** The name of a teleport known only by its place id (`MeDto.teleport`). */
/** The city at the feed's point, for the header. */
export const makeCityNameAt = (repo: FeedRepository) => (lat: number, lng: number) => repo.cityNameAt(lat, lng);

export const makePlaceName = (repo: FeedRepository) => (placeId: string, signal?: AbortSignal) =>
  repo.placeName(placeId, signal);

/** Travel closed: the next search is a new billing session. */
export const makeEndCitySearch = (repo: FeedRepository) => () => repo.endCitySearch();

/** Moves the feed, map and search to a city (`POST /me/teleport { placeId }`). */
export const makeTeleport = (repo: FeedRepository) => (placeId: string) => repo.teleport(placeId);

/** Back to where the phone is (`DELETE /me/teleport`). */
export const makeReturnHome = (repo: FeedRepository) => () => repo.returnHome();

/** Where Travel stands (`GET /me`): the teleport in force, if any, and the home place. */
export const makeLoadTravelState = (repo: FeedRepository) => () => repo.getTravelState();
