/**
 * What Explore works with: pins on the map around where the feed looks, the post behind
 * a pin (for its mini card), the interests to browse by, and the posts the
 * Explore list shows — meetups near the person, or search results (spec §6:
 * `MapPinDto`, `PostDetailDto`, `InterestDto`, `PostCardDto`).
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

/** `west,south,east,north` in degrees; the API takes at most 5° a side (20° for a subscriber). */
export type Bbox = { west: number; south: number; east: number; north: number };

/** A pin carries only what places it — no photo, no counts (API map §7). */
export type MapPin = {
  id: string;
  type: PostType;
  lat: number;
  lng: number;
  title: string;
  /** ISO date-time. */
  startAt: string;
};

/** The point the map looks around: a teleport, or the phone (`FeedOriginDto`). */
export type MapOrigin = {
  lat: number;
  lng: number;
  /** The teleport place ("Accra, Ghana"); null for the phone's own location. */
  label: string | null;
  region: string | null;
};

/**
 * How far the pins reach: `radius`, only within 30 km of the origin (free
 * readers); `box`, everywhere in the box asked for (subscribers).
 */
export type MapReach = 'radius' | 'box';

export type MapPins = {
  origin: MapOrigin;
  originSource: 'device' | 'teleport';
  reach: MapReach;
  pins: MapPin[];
};

export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';

export type PostPrice = { amountCents: number; currency: string; exponent: number };

/** The post behind a pin, as the mini card shows it. */
export type PostPreview = {
  id: string;
  type: PostType;
  title: string;
  imageUrl: string | null;
  startAt: string | null;
  /** The line under the title: the host's name for the place, else the city around it. */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  /** Null = no limit. Host not counted in `goingCount`. */
  capacity: number | null;
  goingCount: number;
  /** The price, or nothing: a card shows one or the other. A Plan never has one. */
  price: PostPrice | null;
  /**
   * A link the host shares (tickets, a booking page). Every post joins by RSVP;
   * joining one with a link opens it too, and counts the click for the host.
   */
  externalUrl: string | null;
  visibility: 'open' | 'private';
  rsvpState: RsvpState;
  /** 1 = next. */
  waitlistPosition: number | null;
  /** The server's word that the viewer hosts it. */
  isHost: boolean;
  /** Also compared with the signed-in person's id (`asSeenBy`), as the API asks every card to do. */
  hostId: string;
};

/** The answer to joining: what the button should now say. */
export type RsvpResult = {
  state: RsvpState;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
};

export type Interest = { id: string; name: string; emoji: string | null };

/** The signed-in person: their id, and the interests they picked (`GET /me`). */
export type Me = { id: string; interests: Interest[] };

/** A card in the Explore list: under "Meetups Near You", or a search result (any type). */
export type ListedPost = {
  id: string;
  type: PostType;
  title: string;
  imageUrl: string | null;
  /** Every photo at card size, in the host's order, for the card's head. Empty when the post has none. */
  images: string[];
  startAt: string | null;
  /** The line under the title: the host's name for the place, else the city around it. */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  /** Where it is, to show it on the map; null when the card carries no position. */
  lat: number | null;
  lng: number | null;
  goingCount: number;
  distanceKm: number | null;
  /** How the reader stands with it, for the card's own Join. */
  rsvpState: RsvpState;
  /** A private post asks its host before letting anyone in. */
  visibility: 'open' | 'private';
  /** Compared with the signed-in person's id: their own post offers no Join. */
  hostId: string;
  /** The price, or nothing. A Plan never has one. */
  price: PostPrice | null;
};

export type PostsPage = { items: ListedPost[]; nextCursor: string | null };

/**
 * A city the map search suggests (the place search on the phone). Where it is
 * comes from a second lookup when it is chosen (`placeLocation`).
 */
export type PlaceResult = { placeId: string; name: string; detail: string };

/** Where a chosen place is, to move the camera. */
export type PlaceLocation = { lat: number; lng: number };

/** The single reason the API takes with a report. */
export type ReportReasonCode = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
