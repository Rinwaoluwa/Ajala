import { isApiError } from '@core/api/ApiError';
import { isPlacesError, type PlaceSuggestion } from '@core/places';

import type { FeedPage, PostCard, TravelCity, TravelState } from '../../domain/entities/Feed';
import { FeedError } from '../../domain/entities/FeedError';
import type { FeedPageDto, MeTravelDto, PostCardDto } from '../dto/feedDtos';

/** Smallest unit to display amount (spec §1.5): amountCents / 10 ** exponent. */
const toAmount = (cents: number, exponent: number) => cents / 10 ** exponent;

export function toPostCard(dto: PostCardDto): PostCard {
  const image = dto.images?.[0];
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    imageUrl: image?.cardUrl ?? null,
    startAt: dto.startAt ?? null,
    endAt: dto.endAt ?? null,
    recurrence: dto.recurrence?.frequency ?? null,
    // The host's name for the place, else the city around it: a dropped pin has no name of its own.
    placeName: dto.placeName || dto.localityLabel || null,
    placeId: dto.placeId ?? null,
    formattedAddress: dto.formattedAddress ?? null,
    localityLabel: dto.localityLabel ?? null,
    countryCode: dto.countryCode ?? null,
    host: {
      id: dto.host?.id ?? '',
      name: dto.host?.displayName ?? '',
      avatarUrl: dto.host?.avatarUrl ?? null,
      verified: dto.host?.verified ?? false,
    },
    distanceKm: dto.distanceKm ?? null,
    description: dto.description?.trim() || null,
    visibility: dto.visibility === 'private' ? 'private' : 'open',
    goingCount: dto.goingCount ?? 0,
    capacity: dto.capacity ?? null,
    price: dto.price
      ? { amount: toAmount(dto.price.amountCents, dto.price.exponent), currency: dto.price.currency }
      : null,
    rsvpState: dto.rsvpState ?? 'none',
    saved: dto.saved ?? false,
  };
}

export function toFeedPage(dto: FeedPageDto): FeedPage {
  return {
    origin: {
      lat: dto.origin.lat,
      lng: dto.origin.lng,
      // An empty string is no name: the header falls back as it would for null.
      label: dto.origin.label || null,
      region: dto.origin.region || null,
    },
    originSource: dto.originSource === 'teleport' ? 'teleport' : 'device',
    items: (dto.items ?? []).map(toPostCard),
    nextCursor: dto.nextCursor ?? null,
  };
}

export const toTravelState = (dto: MeTravelDto): TravelState => ({
  viewerId: dto.id ?? null,
  teleport: dto.teleport?.placeId ? { placeId: dto.teleport.placeId } : null,
  homePlace: dto.homePlace
    ? { placeId: dto.homePlace.placeId, label: dto.homePlace.label, countryCode: dto.homePlace.countryCode ?? null }
    : null,
});

export const toTravelCity = (s: PlaceSuggestion): TravelCity => ({
  placeId: s.placeId,
  name: s.primaryText,
  detail: s.secondaryText,
});

/**
 * By the API's code (spec §5), never its message. A 400 means "not a city"
 * and a 503 "the map vendor is down" only on a teleport, so `context` says
 * which call failed. A place search failing is a `PlacesError`, never an API
 * error: it reads as "Place search isn't available right now".
 */
export function toFeedError(e: unknown, context?: 'teleport'): FeedError {
  if (e instanceof FeedError) return e;
  if (isPlacesError(e)) return new FeedError('placesUnavailable', e.message);
  if (isApiError(e)) {
    if (e.code === 'NO_LOCATION') return new FeedError('noLocation', e.message);
    if (e.code === 'PAYMENT_REQUIRED') return new FeedError('paymentRequired', e.message);
    if (context === 'teleport' && (e.code === 'VALIDATION_FAILED' || e.code === 'BAD_REQUEST')) {
      return new FeedError('notACity', e.message);
    }
    if (context === 'teleport' && e.code === 'SERVICE_UNAVAILABLE') return new FeedError('unavailable', e.message);
    if (e.code === 'NETWORK' || e.code === 'TIMEOUT') return new FeedError('network', e.message);
    if (e.code === 'UNAUTHORIZED') return new FeedError('sessionExpired', e.message);
    return new FeedError('unknown', e.message);
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new FeedError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
