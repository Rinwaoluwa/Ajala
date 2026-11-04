import type { CityRefDto, InterestDto, ProfileExtrasDto, ProfilePhotoDto } from './profileDtos';

/** `PublicProfileDto` (spec §6), trimmed to what the profile page shows. */
export interface PublicProfileDto {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  photos: ProfilePhotoDto[] | null;
  homeCity: CityRefDto | null;
  ageBand?: string | null;
  verified: boolean;
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  memberSince: string;
  blockedByMe: boolean;
}

/** `PostCardDto` (spec §6), trimmed to a profile's compact card. */
export interface ActivityCardDto {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  images: { thumbUrl: string; cardUrl: string; fullUrl: string }[] | null;
  startAt: string | null;
  placeName: string | null;
  city: CityRefDto;
  capacity: number | null;
  goingCount: number;
  interests: InterestDto[] | null;
}

/** `HostedPostsPageDto` / `MyPostsPageDto`. */
export interface ActivityPageDto {
  items: ActivityCardDto[];
  nextCursor: string | null;
}

export interface ReportUserDto {
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  details?: string;
}
