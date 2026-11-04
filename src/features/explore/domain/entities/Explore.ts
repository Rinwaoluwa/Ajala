/**
 * What Explore works with: pins on the map of the feed's city, the post behind
 * a pin (for its mini card), the interests to browse by, and the meetups near
 * the person (spec §6: `MapPinDto`, `PostDetailDto`, `InterestDto`, `PostCardDto`).
 */

export type PostType = 'meetup' | 'event' | 'plan' | 'group';

/** `west,south,east,north` in degrees; the API takes at most 5° a side. */
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

export type MapPins = { cityName: string; pins: MapPin[] };

export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type JoinMode = 'rsvp' | 'external';

export type PostPrice = { amountCents: number; currency: string; exponent: number };

/** The post behind a pin, as the mini card shows it. */
export type PostPreview = {
  id: string;
  type: PostType;
  title: string;
  imageUrl: string | null;
  startAt: string | null;
  placeName: string | null;
  /** Null = no limit. Host not counted in `goingCount`. */
  capacity: number | null;
  goingCount: number;
  price: PostPrice | null;
  joinMode: JoinMode;
  externalUrl: string | null;
  visibility: 'open' | 'private';
  rsvpState: RsvpState;
  /** 1 = next. */
  waitlistPosition: number | null;
  isHost: boolean;
};

/** The answer to joining: what the button should now say. */
export type RsvpResult = {
  state: RsvpState;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
};

export type Interest = { id: string; name: string; emoji: string | null };

/** A card under "Meetups Near You". */
export type NearbyMeetup = {
  id: string;
  title: string;
  imageUrl: string | null;
  startAt: string | null;
  placeName: string | null;
  goingCount: number;
  distanceKm: number | null;
};

export type MeetupsPage = { items: NearbyMeetup[]; nextCursor: string | null };

/** A city the map search finds, with where to move the camera. */
export type PlaceResult = { id: string; label: string; lat: number; lng: number };

/** The single reason the API takes with a report. */
export type ReportReasonCode = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
