import { isApiError } from '@core/api/ApiError';

import type {
  Interest,
  ListedPost,
  MapPins,
  PlaceResult,
  PostPreview,
  PostsPage,
  RsvpResult,
} from '../../domain/entities/Explore';
import { ExploreError } from '../../domain/entities/ExploreError';
import type {
  CityDto,
  InterestDto,
  MapPinsDto,
  PostCardDto,
  PostDetailDto,
  RsvpStateResponseDto,
} from '../dto/exploreDtos';

export const toMapPins = (dto: MapPinsDto): MapPins => ({
  cityName: dto.city?.name ?? '',
  pins: (dto.pins ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    lat: p.lat,
    lng: p.lng,
    title: p.title,
    startAt: p.startAt,
  })),
});

export const toPostPreview = (dto: PostDetailDto): PostPreview => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  imageUrl: dto.images?.[0]?.cardUrl ?? null,
  startAt: dto.startAt ?? null,
  placeName: dto.placeName ?? null,
  capacity: dto.capacity ?? null,
  goingCount: dto.goingCount ?? 0,
  price: dto.price
    ? { amountCents: dto.price.amountCents, currency: dto.price.currency, exponent: dto.price.exponent }
    : null,
  costShare: dto.costSplit
    ? {
        perPersonCents: dto.costSplit.perPersonCents,
        currency: dto.costSplit.currency,
        exponent: dto.costSplit.exponent,
        expectedCount: dto.costSplit.expectedCount,
      }
    : null,
  joinMode: dto.joinMode ?? 'rsvp',
  externalUrl: dto.externalUrl ?? null,
  visibility: dto.visibility ?? 'open',
  rsvpState: dto.rsvpState ?? 'none',
  waitlistPosition: dto.waitlistPosition ?? null,
  isHost: dto.isHost ?? false,
});

export const toRsvpResult = (dto: RsvpStateResponseDto): RsvpResult => ({
  state: dto.state,
  goingCount: dto.goingCount,
  capacity: dto.capacity ?? null,
  waitlistPosition: dto.waitlistPosition ?? null,
});

export const toInterest = (dto: InterestDto): Interest => ({
  id: dto.id,
  name: dto.name,
  emoji: dto.emoji ?? null,
});

const toListedPost = (dto: PostCardDto): ListedPost => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  imageUrl: dto.images?.[0]?.cardUrl ?? null,
  startAt: dto.startAt ?? null,
  placeName: dto.placeName ?? null,
  goingCount: dto.goingCount ?? 0,
  distanceKm: dto.distanceKm ?? null,
});

/** A page of `GET /feed` or `GET /search/posts`: the same cards either way. */
export const toPostsPage = (dto: { items: PostCardDto[] | null; nextCursor: string | null }): PostsPage => ({
  items: (dto.items ?? []).map(toListedPost),
  nextCursor: dto.nextCursor ?? null,
});

export const toPlaceResult = (dto: CityDto): PlaceResult => ({
  id: dto.id,
  label: dto.label || [dto.name, dto.countryName].filter(Boolean).join(', '),
  lat: dto.lat,
  lng: dto.lng,
});

/**
 * By the API's code (spec §5), never its message. A plain 409 or 400 means
 * something specific only on a report — one is already open, or it is the
 * person's own post — so `context` says which call failed. Anywhere else a
 * plain 409 is the generic "it changed": the caller re-reads the post.
 */
export function toExploreError(e: unknown, context: 'report' | 'other' = 'other'): ExploreError {
  if (e instanceof ExploreError) return e;
  if (isApiError(e)) {
    if (context === 'report' && e.code === 'CONFLICT') return new ExploreError('alreadyReported', e.message);
    if (context === 'report' && e.code === 'BAD_REQUEST') return new ExploreError('ownPost', e.message);
    switch (e.code) {
      case 'REPORTING_PAUSED':
        return new ExploreError('reportingPaused', e.message);
      case 'CONFLICT':
        return new ExploreError('conflict', e.message);
      case 'NO_CITY':
        return new ExploreError('noCity', e.message);
      case 'NETWORK':
      case 'TIMEOUT':
        return new ExploreError('network', e.message);
      case 'UNAUTHORIZED':
        return new ExploreError('sessionExpired', e.message);
      case 'NOT_FOUND':
      case 'GONE':
        return new ExploreError('notFound', e.message);
      case 'POST_FULL':
        return new ExploreError('postFull', e.message);
      case 'POST_STARTED':
        return new ExploreError('postStarted', e.message);
      case 'POST_CANCELLED':
        return new ExploreError('postCancelled', e.message);
      case 'EXTERNAL_BOOKING':
        return new ExploreError('externalBooking', e.message);
      case 'RATE_LIMITED':
        return new ExploreError('rateLimited', e.message);
      default:
        return new ExploreError('unknown', e.message);
    }
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new ExploreError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
