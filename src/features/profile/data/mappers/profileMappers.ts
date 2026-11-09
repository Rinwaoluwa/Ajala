import { isApiError } from '@core/api/ApiError';
import { isPlacesError, type CityRef as FoundCity, type PlaceSuggestion } from '@core/places';

import type { CitySuggestion, Interest, MyProfile, PlaceRef, TravelStyle } from '../../domain/entities/Profile';
import { ProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import type { InterestDto, MeDto, PlaceRefDto, ProfileExtrasDto } from '../dto/profileDtos';

/**
 * The server sends one label ("Lagos, Nigeria"); a chip wants just the city, so
 * the name is what comes before the first comma.
 */
export const toPlaceRef = (dto: PlaceRefDto): PlaceRef => {
  const label = dto.label?.trim() ?? '';
  return {
    placeId: dto.placeId,
    name: label.split(',')[0]?.trim() || label,
    label,
    countryCode: dto.countryCode ?? null,
  };
};

export const toPlaceRefs = (list: PlaceRefDto[] | null | undefined): PlaceRef[] => (list ?? []).map(toPlaceRef);

/**
 * A search row as a city the profile can hold. The label is built the way the
 * server writes it ("Lagos, Nigeria"), so a city picked in this run reads the
 * same as one read back from `GET /me`. The country code is not in a
 * suggestion; the server fills it in on the next read.
 */
export const toCitySuggestion = (s: PlaceSuggestion): CitySuggestion => ({
  placeId: s.placeId,
  name: s.primaryText,
  label: [s.primaryText, s.secondaryText].filter(Boolean).join(', '),
  countryCode: null,
  detail: s.secondaryText,
});

/** "Detect my city" names only the city. */
export const toFoundCity = (c: FoundCity): PlaceRef => ({
  placeId: c.placeId,
  name: c.name,
  label: c.name,
  countryCode: null,
});

export const toInterest = (dto: InterestDto): Interest => ({
  id: dto.id,
  slug: dto.slug,
  name: dto.name,
  emoji: dto.emoji ?? null,
});

/** `extras.travelStyles`, which may be missing or null (null clears them). */
export const toTravelStyles = (extras: ProfileExtrasDto | null | undefined): TravelStyle[] =>
  Array.isArray(extras?.travelStyles) ? [...extras.travelStyles] : [];

export function toMyProfile(dto: MeDto): MyProfile {
  return {
    id: dto.id,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    handle: dto.handle ?? null,
    dateOfBirth: dto.dob ?? null,
    gender: dto.gender ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    homePlace: dto.homePlace ? toPlaceRef(dto.homePlace) : null,
    interests: (dto.interests ?? []).map(toInterest),
    languages: Array.isArray(dto.extras?.languages) ? dto.extras.languages : [],
    travelStyles: toTravelStyles(dto.extras),
    favouriteDestinations: toPlaceRefs(dto.favouriteDestinations),
    subscribed: dto.subscribed ?? false,
    // The server's stamp, as sent: completion is never worked out on the phone (spec §2.4).
    profileCompletedAt: dto.profileCompletedAt ?? null,
    about: {
      bio: dto.bio ?? null,
      pronouns: typeof dto.extras?.pronouns === 'string' ? dto.extras.pronouns : null,
      tagline: typeof dto.extras?.tagline === 'string' ? dto.extras.tagline : null,
      socialLinks: {
        instagram: dto.extras?.socialLinks?.instagram ?? null,
        tiktok: dto.extras?.socialLinks?.tiktok ?? null,
        website: dto.extras?.socialLinks?.website ?? null,
      },
      photos: [...(dto.photos ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl })),
      verified: dto.verified ?? false,
    },
  };
}

/**
 * Turns whatever a profile call threw into a `ProfileError`, by the API's code
 * (spec §5). `handle` says the call was about the handle, where a 409 CONFLICT
 * means "taken" and a 400 means the server will not have it. `person` says it
 * was about someone else: a 404 means they are not available, a 409 that a
 * report is already open, a 400 that it was the person's own profile.
 */
export function toProfileError(
  e: unknown,
  context: { handle?: boolean; person?: boolean } = {},
): ProfileError {
  if (e instanceof ProfileError) return e;
  // Google could not be reached or refused the key: every kind reads the same to the person.
  if (isPlacesError(e)) return new ProfileError('placesUnavailable', { message: e.message });
  if (!isApiError(e)) {
    // Auth's session wrapper ends a dead session with its own error type.
    const code = (e as { code?: unknown } | null)?.code;
    return new ProfileError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }

  const byCode: Partial<Record<string, ProfileErrorCode>> = {
    HANDLE_COOLDOWN: 'handleCooldown',
    PAYLOAD_TOO_LARGE: 'imageTooLarge',
    UNSUPPORTED_MEDIA_TYPE: 'imageNotSupported',
    RATE_LIMITED: 'rateLimited',
    NETWORK: 'network',
    TIMEOUT: 'network',
    UNAUTHORIZED: 'sessionExpired',
  };
  let code = byCode[e.code];
  // About another person (their profile, a block, a report): spec §2.14, §3.12.
  if (!code && context.person) {
    if (e.code === 'NOT_FOUND') code = 'notFound';
    else if (e.code === 'CONFLICT') code = 'alreadyReported';
    else if (e.code === 'BAD_REQUEST' || e.code === 'VALIDATION_FAILED') code = 'ownProfile';
  }
  if (!code && context.handle) {
    if (e.code === 'CONFLICT') code = 'handleTaken';
    else if (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST') code = 'handleInvalid';
  }
  if (!code && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) code = 'invalidDetails';

  const availableAt = typeof e.details?.availableAt === 'string' ? e.details.availableAt : null;
  return new ProfileError(code ?? 'unknown', {
    message: e.message,
    availableAt,
    retryAfterSeconds: e.retryAfterSeconds ?? null,
  });
}
