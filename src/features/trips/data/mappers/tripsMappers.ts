import { isApiError } from '@core/api/ApiError';

import type { TripCard, TripsPage } from '../../domain/entities/Trip';
import { TripsError } from '../../domain/entities/TripsError';
import type { MyPostDto, PageDto, PostCardDto } from '../dto/tripsDtos';

export function toTripCard(dto: PostCardDto | MyPostDto): TripCard {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    imageUrl: dto.images?.[0]?.cardUrl ?? null,
    startAt: dto.startAt ?? null,
    placeName: dto.placeName ?? null,
    cityLabel: dto.city?.label ?? dto.city?.name ?? '',
    goingCount: dto.goingCount ?? 0,
    status: 'status' in dto && dto.status ? dto.status : 'published',
  };
}

export const toTripsPage = (dto: PageDto<PostCardDto | MyPostDto>): TripsPage => ({
  items: (dto.items ?? []).map(toTripCard),
  nextCursor: dto.nextCursor ?? null,
});

/** By the API's code (spec §5), never its message. */
export function toTripsError(e: unknown): TripsError {
  if (e instanceof TripsError) return e;
  if (isApiError(e)) {
    if (e.code === 'NETWORK' || e.code === 'TIMEOUT') return new TripsError('network', e.message);
    if (e.code === 'UNAUTHORIZED') return new TripsError('sessionExpired', e.message);
    return new TripsError('unknown', e.message);
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new TripsError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
