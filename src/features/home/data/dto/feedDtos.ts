/**
 * Wire shapes for the feed (spec §6, `FeedPageDto` / `PostCardDto`), trimmed to
 * what a card shows. The repo's OpenAPI copy has no feed or post paths yet, so
 * these follow the client spec — flagged to the backend.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface CityDto extends CityRefDto {
  region: string;
  countryName: string;
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
  images: PostImageDto[] | null;
  startAt: string | null;
  placeName: string | null;
  capacity: number | null;
  price: PostPriceDto | null;
  goingCount: number;
  host: HostCardDto;
  distanceKm: number | null;
}

export interface FeedPageDto {
  items: PostCardDto[];
  nextCursor: string | null;
  city: CityRefDto;
  citySource: 'device' | 'edge' | 'home';
}
