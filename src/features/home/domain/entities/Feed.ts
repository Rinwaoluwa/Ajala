/**
 * The home feed: post cards for one city (`FeedPageDto`, trimmed to what a card
 * shows). The server picks the city — from the phone's location, a network
 * guess, then the home city — and says which (`citySource`).
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

/** `all`, or one post type: the only filter the feed has (API map §4). */
export type FeedFilter = 'all' | PostType;

export type CitySource = 'device' | 'edge' | 'home';

export type FeedCity = { id: string; name: string; countryCode: string; label: string };

export type PostPrice = { amount: number; currency: string };

export type PostCard = {
  id: string;
  type: PostType;
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  host: { name: string; avatarUrl: string | null; verified: boolean };
  /** Null without the location header. */
  distanceKm: number | null;
  goingCount: number;
  capacity: number | null;
  price: PostPrice | null;
};

export type FeedPage = {
  city: FeedCity;
  citySource: CitySource;
  items: PostCard[];
  /** Null on the last page. */
  nextCursor: string | null;
};

/** A city the Travel picker lists. */
export type CatalogCity = { id: string; name: string; countryCode: string; countryName: string };

/** Where a Travel Pro member is browsing instead of their own city. */
export type TravelCity = { id: string; name: string; countryCode: string; countryName?: string };
