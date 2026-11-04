/**
 * Wire shapes for the Trips tab (spec §6: `MyPostsPageDto`, `HostedPostsPageDto`),
 * trimmed to what a trip card shows.
 */

export type PostTypeDto = 'meetup' | 'event' | 'plan' | 'group';

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface PostImageDto {
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
}

export interface PostCardDto {
  id: string;
  type: PostTypeDto;
  title: string;
  images: PostImageDto[] | null;
  startAt: string | null;
  placeName: string | null;
  city: CityRefDto | null;
  goingCount: number;
}

export interface MyPostDto extends PostCardDto {
  status: 'draft' | 'published' | 'taken_down' | 'cancelled';
  publishedAt: string | null;
  updatedAt: string;
}

export interface PageDto<T> {
  items: T[];
  nextCursor: string | null;
}
