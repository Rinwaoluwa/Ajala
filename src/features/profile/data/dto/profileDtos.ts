/**
 * Wire shapes from `contracts/openapi/ajala-api.json`, trimmed to the fields the
 * profile uses. Types the spec marks required but says may be null before
 * onboarding (`gender`, `homeCity`) are nullable here (spec §6).
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

/** Open-ended on purpose: a PATCH sends back every key it was given. */
export interface ProfileExtrasDto {
  languages?: string[];
  [key: string]: unknown;
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
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  profileCompletedAt: string | null;
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
