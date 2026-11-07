/**
 * The home feed: post cards for one city (`FeedPageDto`). The server picks the
 * city — a Travel teleport first, then the phone's location, a network guess,
 * then the home city (spec §2.11) — and says which (`citySource`).
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

/** `all`, or one post type: the only filter the feed has (API map §4). */
export type FeedFilter = 'all' | PostType;

/** `teleport` means a Travel subscriber has pointed the feed at another city. */
export type CitySource = 'device' | 'edge' | 'home' | 'teleport';

export type FeedCity = { id: string; name: string; countryCode: string; label: string };

export type PostPrice = { amount: number; currency: string };

/** A shared cost (Plans and Groups): what each person pays, as the server worked it out. */
export type CostShare = { perPerson: number; currency: string; expectedCount: number };

export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

export type PostCard = {
  id: string;
  type: PostType;
  title: string;
  /** The 800px card image, or null when the post has none. */
  imageUrl: string | null;
  /** ISO date-time; null only on a draft. */
  startAt: string | null;
  /** ISO date-time, or null when the host gave no end. */
  endAt: string | null;
  /** How often a Group meets again; null for a one-off. */
  recurrence: Recurrence | null;
  placeName: string | null;
  host: { name: string; avatarUrl: string | null; verified: boolean };
  /** Null without the location header. */
  distanceKm: number | null;
  goingCount: number;
  capacity: number | null;
  price: PostPrice | null;
  costShare: CostShare | null;
  rsvpState: RsvpState;
  joinMode: 'rsvp' | 'external';
  /** Whether this person has bookmarked it (the card's save button starts from this). */
  saved: boolean;
};

export type FeedPage = {
  city: FeedCity;
  citySource: CitySource;
  items: PostCard[];
  /** Null on the last page. */
  nextCursor: string | null;
};

/** A city the Travel picker lists: from search or the Popular row. */
export type CatalogCity = { id: string; name: string; countryCode: string; countryName: string };
