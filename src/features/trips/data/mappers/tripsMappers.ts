import { isApiError } from '@core/api/ApiError';

import type { TripCard, TripRole, TripsPage } from '../../domain/entities/Trip';
import { TripsError } from '../../domain/entities/TripsError';
import type { MyPostDto, PageDto, PostCardDto } from '../dto/tripsDtos';

/** `role` comes from the list the card was read from (see `TripRole`). */
export function toTripCard(dto: PostCardDto | MyPostDto, role: TripRole): TripCard {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    imageUrl: dto.images?.[0]?.cardUrl ?? null,
    startAt: dto.startAt ?? null,
    endAt: dto.endAt ?? null,
    recurrence: dto.recurrence?.frequency ?? null,
    placeName: dto.placeName ?? null,
    cityLabel: dto.city?.label ?? dto.city?.name ?? '',
    goingCount: dto.goingCount ?? 0,
    // Only my own posts carry a status; every other list holds live posts.
    status: 'status' in dto && dto.status ? dto.status : 'published',
    role,
  };
}

export const toTripsPage = (dto: PageDto<PostCardDto | MyPostDto>, role: TripRole): TripsPage => ({
  items: (dto.items ?? []).map((item) => toTripCard(item, role)),
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
