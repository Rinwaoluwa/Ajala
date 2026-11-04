import type { CatalogCity, FeedFilter, FeedPage, TravelCity } from '../entities/Feed';

/** The feed's contract; the data layer implements it over the API. Rejects with `FeedError`. */
export interface FeedRepository {
  /**
   * `travelTo` is a Travel Pro destination. The API cannot point the feed at
   * a city yet (it picks the city itself, API map §4), so the live repository ignores it.
   */
  getFeed(
    filter: FeedFilter,
    cursor: string | null,
    limit: number,
    travelTo: TravelCity | null,
  ): Promise<FeedPage>;
  searchCities(query: string, limit: number): Promise<CatalogCity[]>;
}
