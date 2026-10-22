import type { CatalogCity, FeedFilter, FeedPage } from '../entities/Feed';

/** The feed's contract; the data layer implements it over the API. Rejects with `FeedError`. */
export interface FeedRepository {
  getFeed(filter: FeedFilter, cursor: string | null, limit: number): Promise<FeedPage>;
  searchCities(query: string, limit: number): Promise<CatalogCity[]>;
}
