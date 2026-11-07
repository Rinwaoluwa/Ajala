import type {
  CityRefDto,
  GenderDto,
  InterestDto,
  ProfileExtrasDto,
  ProfilePhotoDto,
  VisitingDto,
} from './profileDtos';

/** `PublicProfileDto` (spec §6), trimmed to what the profile page shows. */
export interface PublicProfileDto {
  id: string;
  handle: string | null;
  /** First name plus last initial. */
  displayName: string;
  avatarUrl: string | null;
  gender: GenderDto | null;
  bio: string | null;
  photos: ProfilePhotoDto[] | null;
  /** Null also when they hide their city. */
  homeCity: CityRefDto | null;
  visiting: VisitingDto | null;
  verified: boolean;
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  favouriteCities: CityRefDto[] | null;
  openToMeetToday: boolean;
  /** `GET /users/:id/plans` lists them. */
  sharePlans: boolean;
  memberSince: string;
  blockedByMe: boolean;
}

export interface HostCardDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

/** `PostCardDto` (spec §6), trimmed to what a profile's cards and the Saved list show. */
export interface ActivityCardDto {
  id: string;
  type: 'meetup' | 'event' | 'plan' | 'group';
  title: string;
  images: { thumbUrl: string; cardUrl: string; fullUrl: string }[] | null;
  /** Null only on a draft. */
  startAt: string | null;
  placeName: string | null;
  city: CityRefDto | null;
  capacity: number | null;
  goingCount: number;
  saved: boolean;
  host: HostCardDto;
  interests: InterestDto[] | null;
  distanceKm: number | null;
}

/** `HostedPostsPageDto`, and the pages of `/me/saved`, `/me/rsvps`, `/me/attended`. */
export interface ActivityPageDto {
  items: ActivityCardDto[];
  nextCursor: string | null;
}

export interface ReportUserDto {
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  details?: string;
}
