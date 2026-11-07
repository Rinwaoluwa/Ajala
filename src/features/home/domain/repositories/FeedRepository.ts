import type { CatalogCity, FeedFilter, FeedPage } from '../entities/Feed';

/** The feed's contract; the data layer implements it over the API. Rejects with `FeedError`. */
export interface FeedRepository {
  /** The server picks the city (teleport, location, network guess, home); the app never sends one. */
  getFeed(filter: FeedFilter, cursor: string | null, limit: number): Promise<FeedPage>;
  searchCities(query: string, limit: number): Promise<CatalogCity[]>;
  /** Up to 12 cities with the most live posts, busiest first. */
  popularCities(): Promise<CatalogCity[]>;
  /** Points the feed, map and search at a city until `returnHome` (Travel subscribers only). */
  teleport(cityId: string): Promise<void>;
  returnHome(): Promise<void>;
}
