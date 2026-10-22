import { isApiError } from '@core/api/ApiError';

import type { City, CityRef, Interest, MyProfile } from '../../domain/entities/Profile';
import { ProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import type { CityDto, CityRefDto, InterestDto, MeDto } from '../dto/profileDtos';

export const toCityRef = (dto: CityRefDto): CityRef => ({
  id: dto.id,
  name: dto.name,
  countryCode: dto.countryCode,
  label: dto.label || dto.name,
});

export const toCity = (dto: CityDto): City => ({
  ...toCityRef(dto),
  region: dto.region ?? '',
  countryName: dto.countryName ?? '',
});

export const toInterest = (dto: InterestDto): Interest => ({
  id: dto.id,
  slug: dto.slug,
  name: dto.name,
  emoji: dto.emoji ?? null,
});

export function toMyProfile(dto: MeDto): MyProfile {
  return {
    id: dto.id,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    handle: dto.handle ?? null,
    dateOfBirth: dto.dob ?? null,
    gender: dto.gender ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    homeCity: dto.homeCity ? toCityRef(dto.homeCity) : null,
    interests: (dto.interests ?? []).map(toInterest),
    languages: Array.isArray(dto.extras?.languages) ? dto.extras.languages : [],
    profileCompletedAt: dto.profileCompletedAt ?? null,
  };
}

/**
 * Turns whatever a profile call threw into a `ProfileError`, by the API's code
 * (spec §5). `handle` says the call was about the handle, where a 409 CONFLICT
 * means "taken" and a 400 means the server will not have it.
 */
export function toProfileError(e: unknown, context: { handle?: boolean } = {}): ProfileError {
  if (e instanceof ProfileError) return e;
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
