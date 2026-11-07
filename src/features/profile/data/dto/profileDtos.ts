/**
 * Wire shapes from the client spec's types (docs/api/ajala-api-users-common.md
 * §6, the source of truth), trimmed to the fields the profile uses.
 */

export type GenderDto = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';

export interface CityRefDto {
  id: string;
  name: string;
  countryCode: string;
  label: string;
}

export interface CityDto extends CityRefDto {
  region: string;
  countryName: string;
  timezone: string;
  lat: number;
  lng: number;
}

export interface CityResolveDto {
  city: CityDto;
  distanceKm: number;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export interface VisitingDto {
  city: CityRefDto;
}

export type TravelStyleDto =
  | 'family'
  | 'solo'
  | 'shopping'
  | 'local_life'
  | 'rail_travel'
  | 'diving'
  | 'art_lover'
  | 'backpacker'
  | 'skiing'
  | 'cruise'
  | 'cycling'
  | 'eco_travel'
  | 'safari'
  | 'nightlife'
  | 'foodie'
  | 'beach'
  | 'festivals'
  | 'spiritual'
  | 'road_trip'
  | 'mountains'
  | 'culture'
  | 'hiking'
  | 'surfing'
  | 'sailing'
  | 'luxury'
  | 'photography'
  | 'adventurer'
  | 'budget'
  | 'staycation'
  | 'city_break'
  | 'history'
  | 'digital_nomad'
  | 'snow_escape'
  | 'glamping'
  | 'couples'
  | 'camping';

/**
 * Open-ended on purpose: a PATCH sends back every key the profile already had,
 * including any this app does not know yet.
 */
export interface ProfileExtrasDto {
  /** ISO 639-1. */
  languages?: string[];
  /** Up to 10; an empty list or null clears them. */
  travelStyles?: TravelStyleDto[] | null;
  /** Up to 10 city ids; read back as `favouriteCities`. */
  favouriteCityIds?: string[];
  pronouns?: string | null;
  tagline?: string | null;
  socialLinks?: {
    instagram?: string | null;
    tiktok?: string | null;
    website?: string | null;
  };
  [key: string]: unknown;
}

export interface ProfilePhotoDto {
  id: string;
  url: string;
  thumbUrl: string;
  position: number;
}

export interface MeDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  dob: string | null;
  gender: GenderDto | null;
  avatarUrl: string | null;
  homeCity: CityRefDto | null;
  /** The city a trip of mine covers today; read-only (spec §2.8). */
  visiting: VisitingDto | null;
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  favouriteCities: CityRefDto[] | null;
  /** Travel is on right now. */
  subscribed: boolean;
  /** Re-check after this; null without a subscription. */
  subscribedUntil: string | null;
  /** Set by the server; never worked out on the phone (spec §2.4). */
  profileCompletedAt: string | null;
  bio: string | null;
  photos: ProfilePhotoDto[] | null;
  verified: boolean;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: GenderDto;
  handle?: string;
  homeCityId?: string | null;
  interestIds?: string[];
  extras?: ProfileExtrasDto;
}

export interface AvatarDto {
  avatarUrl: string | null;
}

export interface HandleAvailabilityDto {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'format' | null;
}
