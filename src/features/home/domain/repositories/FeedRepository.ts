import type { FeedFilter, FeedPage, TravelCity, TravelState } from '../entities/Feed';

/** The feed's contract; the data layer implements it over the API. Rejects with `FeedError`. */
export interface FeedRepository {
  /** The server picks the point (teleport, then the phone's location); the app never sends a place. */
  getFeed(filter: FeedFilter, cursor: string | null, limit: number): Promise<FeedPage>;
  /**
   * A post's description, for a card: feed cards don't carry it yet (backend
   * request B4). Null when it has none or the post could not be read; never rejects.
   */
  getPostDescription(postId: string): Promise<string | null>;
  /**
   * Cities matching what was typed, from the place search on the phone (the
   * API has none). `signal` cancels a search that typing has overtaken.
   */
  searchCities(query: string, signal?: AbortSignal): Promise<TravelCity[]>;
  /**
   * The city at a point ("London"), for the header over the phone's own
   * location: the feed names only the state or region ("England"). Null when no
   * city is found there.
   */
  cityNameAt(lat: number, lng: number): Promise<string | null>;
  /** A place's name, for a teleport `GET /me` knows only by id. */
  placeName(placeId: string, signal?: AbortSignal): Promise<string>;
  /** Ends the place search's billing session when Travel closes without a lookup. */
  endCitySearch(): void;
  /** Points the feed, map and search at a city until `returnHome` (Travel subscribers only). */
  teleport(placeId: string): Promise<void>;
  returnHome(): Promise<void>;
  /** The teleport in force and the home place, from `GET /me`. */
  getTravelState(): Promise<TravelState>;
}
