/**
 * Wire shapes from the client spec's types (docs/api/ajala-api-users-common.md
 * §6, the source of truth), trimmed to the fields the profile uses.
 */

export type GenderDto = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';

/** A place the API holds by its Google place id (spec §1.6). Cities are no longer a catalogue. */
export interface PlaceRefDto {
  placeId: string;
  /** "Lagos, Nigeria". */
  label: string;
  countryCode: string | null;
}

export interface InterestDto {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
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
  /** Up to 10 Google place ids of cities (an 11th is a 400); read back as `favouriteDestinations`. */
  favouriteDestinationIds?: string[];
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
  /** The home city; null until set. */
  homePlace: PlaceRefDto | null;
  // `visiting` and `teleport` are left out on purpose: trips are parked, so `visiting` is
  // always null (spec §2.8), and teleport belongs to the feed, not the profile.
  interests: InterestDto[] | null;
  extras: ProfileExtrasDto | null;
  /** The cities behind `extras.favouriteDestinationIds`, in order. */
  favouriteDestinations: PlaceRefDto[] | null;
  /** Travel is on right now. */
  subscribed: boolean;
  /** Re-check after this; null without a subscription. */
  subscribedUntil: string | null;
  /** Set by the server; never worked out on the phone (spec §2.4). */
  profileCompletedAt: string | null;
  bio: string | null;
  photos: ProfilePhotoDto[] | null;
  /** An admin badge: the Ajala team reviewed this profile. Not an identity check (backend answers A9). */
  verified: boolean;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: GenderDto;
  handle?: string;
  /** A city's Google place id; a venue or street address is a 400. Null clears it. */
  homePlaceId?: string | null;
  interestIds?: string[];
  extras?: ProfileExtrasDto;
  /** IANA, at most 64 characters. */
  timezone?: string;
}

export interface AvatarDto {
  avatarUrl: string | null;
}

export interface HandleAvailabilityDto {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'format' | null;
}
