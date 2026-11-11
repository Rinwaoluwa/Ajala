/**
 * The home feed: post cards around one point (`FeedPageDto`). The server picks
 * the point, a Travel teleport first and then the phone's location
 * (`X-Client-Location`), and says which (`originSource`). There is no city and
 * no home-city fallback any more: with neither, the feed answers 404
 * NO_LOCATION (spec §2.11).
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

/** `all`, or one post type: the only filter the feed has (API map §4). */
export type FeedFilter = 'all' | PostType;

/** `teleport` means a Travel subscriber has pointed the feed somewhere else; `device` is the phone. */
export type OriginSource = 'device' | 'teleport';

/** The point the feed looks around (`FeedOriginDto`). */
export type FeedOrigin = {
  lat: number;
  lng: number;
  /** The teleport place ("Accra, Ghana"); null for the phone's own location. */
  label: string | null;
  /** The state or region the point is in ("Lagos"); null when nobody can say. */
  region: string | null;
};

export type PostPrice = { amount: number; currency: string };

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
  /**
   * The line under the card: the host's name for the place, else the city and
   * country around it ("Lagos, Nigeria"), so a dropped pin still says where.
   */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  host: { id: string; name: string; avatarUrl: string | null; verified: boolean };
  /** Null without the location header. */
  distanceKm: number | null;
  /**
   * A line about the post, when the server sends one. `PostCardDto` has no
   * description today (it belongs to `PostDetailDto`); the card shows it as soon
   * as the backend adds it (backend request B4).
   */
  description: string | null;
  visibility: 'open' | 'private';
  goingCount: number;
  capacity: number | null;
  /** Null when free or not given: a card shows the price or nothing (there is no shared cost). */
  price: PostPrice | null;
  rsvpState: RsvpState;
  /** Whether this person has bookmarked it (the card's save button starts from this). */
  saved: boolean;
};

export type FeedPage = {
  origin: FeedOrigin;
  originSource: OriginSource;
  items: PostCard[];
  /** Null on the last page. */
  nextCursor: string | null;
};

/**
 * Where Travel stands, from `GET /me`: the teleport in force (null when there
 * is none, or the subscription has ended) and the person's home place. Known
 * after a restart, unlike anything the app remembers itself.
 *
 * `MeDto.teleport` is Swagger's `TeleportDto`, the place id alone (spec §8 Q1),
 * so its name comes from the feed's `origin.label` or a place lookup. The home
 * place centres nothing any more; it only gives the paywall its home flag.
 */
export type TravelState = {
  /** The signed-in person's id, to tell their own posts in the feed apart. */
  viewerId: string | null;
  teleport: { placeId: string } | null;
  homePlace: { placeId: string; label: string; countryCode: string | null } | null;
};

/** A city the Travel picker lists: a place search result or a recent teleport. */
export type TravelCity = {
  /** Google place id: what `POST /me/teleport` takes. */
  placeId: string;
  /** "Accra". */
  name: string;
  /** The line under it ("Ghana"); empty when there is none. */
  detail: string;
};
