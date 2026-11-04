/**
 * Wire shapes Explore reads and sends (spec §6), trimmed to what it uses. The
 * repo's OpenAPI copy has no map, post or explore paths yet, so these follow the
 * client spec.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';
export type RsvpStateDto = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';

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
  citySource: 'device' | 'edge' | 'home';
  pins: MapPinDto[];
}

export interface PostImageDto {
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
}

export interface PostPriceDto {
  amountCents: number;
  currency: string;
  exponent: number;
}

export interface PostCardDto {
  id: string;
  type: PostTypeDto;
  title: string;
  images: PostImageDto[] | null;
  startAt: string | null;
  placeName: string | null;
  capacity: number | null;
  price: PostPriceDto | null;
  externalUrl: string | null;
  joinMode: 'rsvp' | 'external';
  goingCount: number;
  rsvpState: RsvpStateDto;
  visibility: 'open' | 'private';
  distanceKm: number | null;
}

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

export interface FeedPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
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
