import type {
  GenderDto,
  InterestDto,
  PlaceRefDto,
  ProfileExtrasDto,
  ProfilePhotoDto,
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
  /** Their home city. Null also when they hide it (`showCurrentCity` off). */
  homePlace: PlaceRefDto | null;
  // `visiting` is left out: always null while trips are parked (spec §2.8).
  /** An admin badge: the Ajala team reviewed this profile. Not an identity check. */
  verified: boolean;
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  /** In their order. */
  favouriteDestinations: PlaceRefDto[] | null;
  openToMeetToday: boolean;
  /**
   * Their public "Upcoming" list is on: `GET /users/:id/plans` lists them. Not the
   * trusted-person feature (one member who hears about plan changes), which the
   * app must name differently (backend answers C6).
   */
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
  /** "Lagos, Nigeria": the city and country of the post's place; null without one. */
  localityLabel: string | null;
  /** ISO 3166-1 alpha-2 of the post's place. */
  countryCode: string | null;
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
