/**
 * Wire shapes for the feed and teleport (spec §6: `FeedPageDto`,
 * `FeedOriginDto`, `PostCardDto`, `TeleportDto`, and the two fields Travel
 * reads from `MeDto`). The card is the whole `PostCardDto`, not just what Home
 * draws today, so a new field on the card is a mapper change rather than a
 * hunt through the wire types.
 *
 * There are no cities in the API any more (Swagger, 9 Nov): places are Google
 * place ids, found on the phone (`@core/places`), and the feed carries the
 * point it looks around (`origin`) instead of a city.
 *
 * There is no shared cost and no join mode any more (backend answers, Nov 9):
 * every post joins by RSVP, and a card carries a price or nothing.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type OriginSourceDto = 'device' | 'teleport';
export type RecurrenceDto = 'weekly' | 'biweekly' | 'monthly';

/** `PlaceRefDto` (spec §6): a place the API names, e.g. `MeDto.homePlace`. */
export interface PlaceRefDto {
  placeId: string;
  /** "Lagos, Nigeria". */
  label: string;
  countryCode: string | null;
}

/** The point the feed looks around. */
export interface FeedOriginDto {
  lat: number;
  lng: number;
  /** The teleport place, for "Teleported to {label}"; null for the phone's own location. */
  label: string | null;
  /** The state or region of the point; everything there within 150 km is in the feed too. */
  region: string | null;
}

export interface PostImageDto {
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
}

/** amount = amountCents / 10 ** exponent (spec §1.5). */
export interface PostPriceDto {
  amountCents: number;
  currency: string;
  exponent: number;
}

export interface PostRecurrenceDto {
  frequency: RecurrenceDto;
  /** YYYY-MM-DD; null repeats until the host stops it. */
  endsOn: string | null;
}

export interface HostCardDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export interface PostCardDto {
  id: string;
  type: PostTypeDto;
  title: string;
  images: PostImageDto[];
  /** Null only on a draft. */
  startAt: string | null;
  endAt: string | null;
  recurrence: PostRecurrenceDto | null;
  /** The label under the card. */
  placeName: string | null;
  /** The Google place the host picked; null for a dropped pin. */
  placeId: string | null;
  formattedAddress: string | null;
  /** The city and country, e.g. "Lagos, Nigeria". */
  localityLabel: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  /** Null = no limit. */
  capacity: number | null;
  /** Null = free. */
  price: PostPriceDto | null;
  /** A host's own link (tickets, a booking page); joining is still an RSVP. */
  externalUrl: string | null;
  /** The host is not counted. */
  goingCount: number;
  rsvpState: RsvpStateDto;
  saved: boolean;
  visibility: 'open' | 'private';
  host: HostCardDto;
  interests: InterestDto[];
  distanceKm: number | null;
}

export interface FeedPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
  origin: FeedOriginDto;
  originSource: OriginSourceDto;
}

/** A Google place id for a city; a venue or an address is a 400. */
export interface TeleportDto {
  placeId: string;
}

/**
 * The part of `MeDto` Travel reads: the teleport in force (Swagger's
 * `TeleportDto`, the place id alone, spec §8 Q1; null when not teleported and
 * once the subscription ends) and the home place. Read under Home's own key,
 * as Settings does, since the shared `['me']` cache holds the profile
 * feature's shape.
 */
export interface MeTravelDto {
  homePlace: PlaceRefDto | null;
  teleport: TeleportDto | null;
}
