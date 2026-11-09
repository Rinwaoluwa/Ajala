/**
 * Wire shapes Explore reads and sends (spec §6). Post cards are the whole
 * `PostCardDto`, so a new field is a mapper change, not a hunt through types.
 *
 * Swagger has no cities any more (9 Nov): the map, feed and search pages carry
 * the point they look around (`origin`, `originSource`) and cards carry Google
 * place fields. The map's city search uses `@core/places` on the phone.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
/** `teleport`: a Travel subscriber has pointed the feed, map and search somewhere else. */
export type OriginSourceDto = 'device' | 'teleport';

/** The point the map, feed and search look around (`FeedOriginDto`). */
export interface FeedOriginDto {
  lat: number;
  lng: number;
  /** The teleport place ("Accra, Ghana"); null for the phone's own location. */
  label: string | null;
  /** The state or region of the point; null when nobody can say. */
  region: string | null;
}

export interface MapPinDto {
  id: string;
  type: PostTypeDto;
  lat: number;
  lng: number;
  title: string;
  startAt: string;
}

export interface MapPinsDto {
  origin: FeedOriginDto;
  originSource: OriginSourceDto;
  /**
   * `radius`: only pins within 30 km of the origin (free readers), so a map
   * panned away is empty. `box`: every pin in the box (subscribers).
   */
  reach: 'radius' | 'box';
  /** At most 500, soonest first. */
  pins: MapPinDto[];
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
  frequency: 'weekly' | 'biweekly' | 'monthly';
  endsOn: string | null;
}

export interface HostCardDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface PostCardDto {
  id: string;
  type: PostTypeDto;
  title: string;
  images: PostImageDto[];
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
  capacity: number | null;
  /** Optional on Meetups, Events and Groups; a Plan never has one. */
  price: PostPriceDto | null;
  /** A link the host shares (tickets, a booking page). Joining still goes by RSVP. */
  externalUrl: string | null;
  goingCount: number;
  rsvpState: RsvpStateDto;
  saved: boolean;
  visibility: 'open' | 'private';
  host: HostCardDto;
  interests: InterestDto[];
  distanceKm: number | null;
}

/** Trimmed to what the mini card reads beyond the card. */
export interface PostDetailDto extends PostCardDto {
  isHost: boolean;
  waitlistPosition: number | null;
}

/** The one field of `MeDto` Explore reads: who is signed in, to spot their own posts. */
export interface MeIdDto {
  id: string;
}

export interface RsvpStateResponseDto {
  state: RsvpStateDto;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
}

/** `GET /feed`, which Explore reads for its meetup list (`type=meetup`). */
export interface FeedPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
  origin: FeedOriginDto;
  originSource: OriginSourceDto;
}

/** `GET /search/posts`: best match first, within 30 km of where the feed looks. */
export interface PostSearchPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
  origin: FeedOriginDto;
  originSource: OriginSourceDto;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export type ReportReasonDto = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';

export interface ReportPostDto {
  reason: ReportReasonDto;
  details?: string;
}
