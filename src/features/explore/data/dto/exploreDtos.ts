/**
 * Wire shapes Explore reads and sends (spec §6). Post cards are the whole
 * `PostCardDto`, so a new field is a mapper change, not a hunt through types.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
/** `teleport`: a Travel subscriber has pointed the feed, map and search at another city. */
export type CitySourceDto = 'device' | 'edge' | 'home' | 'teleport';

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface CityDto extends CityRefDto {
  region: string;
  countryName: string;
  lat: number;
  lng: number;
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
  city: CityRefDto;
  citySource: CitySourceDto;
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
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: CityRefDto | null;
  capacity: number | null;
  price: PostPriceDto | null;
  costSplit: PostCostSplitDto | null;
  externalUrl: string | null;
  joinMode: 'rsvp' | 'external';
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
  city: CityRefDto;
  citySource: CitySourceDto;
}

/** `GET /search/posts`: best match first, in the city the feed would pick. */
export interface PostSearchPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
  city: CityRefDto;
  citySource: CitySourceDto;
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
