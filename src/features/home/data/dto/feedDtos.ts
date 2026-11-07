/**
 * Wire shapes for the feed, the city picker and teleport (spec §6:
 * `FeedPageDto`, `PostCardDto`, `CityDto`, `TeleportDto`). The card is the
 * whole `PostCardDto`, not just what Home draws today, so a new field on the
 * card is a mapper change rather than a hunt through the wire types.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type JoinModeDto = 'rsvp' | 'external';
export type CitySourceDto = 'device' | 'edge' | 'home' | 'teleport';
export type RecurrenceDto = 'weekly' | 'biweekly' | 'monthly';

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface CityDto extends CityRefDto {
  /** State or province; '' where there is none. */
  region: string;
  countryName: string;
  timezone: string;
  lat: number;
  lng: number;
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

/** A Plan or Group sharing a cost; the server works out the per-person share. */
export interface PostCostSplitDto {
  totalCents: number;
  currency: string;
  exponent: number;
  expectedCount: number;
  /** Rounded up: the "about N each" figure. */
  perPersonCents: number;
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
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: CityRefDto | null;
  /** Null = no limit. */
  capacity: number | null;
  /** Null = free. */
  price: PostPriceDto | null;
  costSplit: PostCostSplitDto | null;
  externalUrl: string | null;
  joinMode: JoinModeDto;
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
  city: CityRefDto;
  citySource: CitySourceDto;
}

export interface TeleportDto {
  cityId: string;
}
