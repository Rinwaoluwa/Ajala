import { isApiError } from '@core/api/ApiError';
import { isPlacesError, type PlaceSuggestion } from '@core/places';

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
  InterestDto,
  MapPinsDto,
  PostCardDto,
  PostDetailDto,
  RsvpStateResponseDto,
} from '../dto/exploreDtos';

/**
 * A pins page. A missing `reach` reads as `radius`, the narrower promise: the
 * map then offers Teleport rather than claiming the box is empty everywhere.
 */
export const toMapPins = (dto: MapPinsDto): MapPins => ({
  origin: {
    lat: dto.origin.lat,
    lng: dto.origin.lng,
    label: dto.origin.label || null,
    region: dto.origin.region || null,
  },
  originSource: dto.originSource === 'teleport' ? 'teleport' : 'device',
  reach: dto.reach === 'box' ? 'box' : 'radius',
  pins: (dto.pins ?? []).map((p) => ({
    id: p.id,
    type: p.type,
    lat: p.lat,
    lng: p.lng,
    title: p.title,
    startAt: p.startAt,
  })),
});

/**
 * The card's place fields. `placeName` is the line drawn: the host's name for
 * the place, else the city around it ("Lagos, Nigeria"), since a dropped pin
 * has no name of its own.
 */
const placeOf = (dto: PostCardDto) => ({
  placeName: dto.placeName || dto.localityLabel || null,
  placeId: dto.placeId ?? null,
  formattedAddress: dto.formattedAddress ?? null,
  localityLabel: dto.localityLabel ?? null,
  countryCode: dto.countryCode ?? null,
});

export const toPostPreview = (dto: PostDetailDto): PostPreview => ({
  id: dto.id,
  type: dto.type,
  title: dto.title,
  imageUrl: dto.images?.[0]?.cardUrl ?? null,
  startAt: dto.startAt ?? null,
  ...placeOf(dto),
  capacity: dto.capacity ?? null,
  goingCount: dto.goingCount ?? 0,
  // A Plan carries no money (the API refuses it), so a card never shows a price for one.
  price:
    dto.type !== 'plan' && dto.price
      ? { amountCents: dto.price.amountCents, currency: dto.price.currency, exponent: dto.price.exponent }
      : null,
  externalUrl: dto.externalUrl ?? null,
  visibility: dto.visibility ?? 'open',
  rsvpState: dto.rsvpState ?? 'none',
  waitlistPosition: dto.waitlistPosition ?? null,
  isHost: dto.isHost ?? false,
  hostId: dto.host?.id ?? '',
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
  ...placeOf(dto),
  goingCount: dto.goingCount ?? 0,
  distanceKm: dto.distanceKm ?? null,
});

/** A page of `GET /feed` or `GET /search/posts`: the same cards either way. */
export const toPostsPage = (dto: { items: PostCardDto[] | null; nextCursor: string | null }): PostsPage => ({
  items: (dto.items ?? []).map(toListedPost),
  nextCursor: dto.nextCursor ?? null,
});

export const toPlaceResult = (s: PlaceSuggestion): PlaceResult => ({
  placeId: s.placeId,
  name: s.primaryText,
  detail: s.secondaryText,
});

/**
 * By the API's code (spec §5), never its message. A plain 409 or 400 means
 * something specific only on a report — one is already open, or it is the
 * person's own post — so `context` says which call failed. Anywhere else a
 * plain 409 is the generic "it changed": the caller re-reads the post.
 *
 * A report's 400 is `VALIDATION_FAILED` both for your own post and for "other"
 * with nothing written; only the second names a field (`details`).
 */
export function toExploreError(e: unknown, context: 'report' | 'other' = 'other'): ExploreError {
  if (e instanceof ExploreError) return e;
  if (isPlacesError(e)) return new ExploreError('placesUnavailable', e.message);
  if (isApiError(e)) {
    if (context === 'report' && e.code === 'CONFLICT') return new ExploreError('alreadyReported', e.message);
    if (context === 'report' && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) {
      return e.fieldErrors.some((f) => f.field === 'details')
        ? new ExploreError('detailsRequired', e.message)
        : new ExploreError('ownPost', e.message);
    }
    switch (e.code) {
      case 'REPORTING_PAUSED':
        return new ExploreError('reportingPaused', e.message);
      case 'CONFLICT':
        return new ExploreError('conflict', e.message);
      case 'NO_LOCATION':
        return new ExploreError('noLocation', e.message);
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
      case 'RATE_LIMITED':
        return new ExploreError('rateLimited', e.message);
      default:
        return new ExploreError('unknown', e.message);
    }
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new ExploreError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
