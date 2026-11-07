import { isApiError } from '@core/api/ApiError';

import type { CatalogCity, FeedPage, PostCard } from '../../domain/entities/Feed';
import { FeedError } from '../../domain/entities/FeedError';
import type { CityDto, FeedPageDto, PostCardDto } from '../dto/feedDtos';

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
    placeName: dto.placeName ?? null,
    host: { name: dto.host.displayName, avatarUrl: dto.host.avatarUrl ?? null, verified: dto.host.verified },
    distanceKm: dto.distanceKm ?? null,
    goingCount: dto.goingCount ?? 0,
    capacity: dto.capacity ?? null,
    price: dto.price
      ? { amount: toAmount(dto.price.amountCents, dto.price.exponent), currency: dto.price.currency }
      : null,
    costShare: dto.costSplit
      ? {
          perPerson: toAmount(dto.costSplit.perPersonCents, dto.costSplit.exponent),
          currency: dto.costSplit.currency,
          expectedCount: dto.costSplit.expectedCount,
        }
      : null,
    rsvpState: dto.rsvpState ?? 'none',
    joinMode: dto.joinMode ?? 'rsvp',
    saved: dto.saved ?? false,
  };
}

export function toFeedPage(dto: FeedPageDto): FeedPage {
  return {
    city: { id: dto.city.id, name: dto.city.name, countryCode: dto.city.countryCode, label: dto.city.label },
    citySource: dto.citySource,
    items: (dto.items ?? []).map(toPostCard),
    nextCursor: dto.nextCursor ?? null,
  };
}

export const toCatalogCity = (dto: CityDto): CatalogCity => ({
  id: dto.id,
  name: dto.name,
  countryCode: dto.countryCode,
  countryName: dto.countryName ?? '',
});

/**
 * By the API's code (spec §5), never its message. A plain 404 means "no such
 * city" only on a teleport, so `context` says which call failed.
 */
export function toFeedError(e: unknown, context?: 'teleport'): FeedError {
  if (e instanceof FeedError) return e;
  if (isApiError(e)) {
    if (e.code === 'NO_CITY') return new FeedError('noCity', e.message);
    if (e.code === 'PAYMENT_REQUIRED') return new FeedError('paymentRequired', e.message);
    if (context === 'teleport' && e.code === 'NOT_FOUND') return new FeedError('cityNotFound', e.message);
    if (e.code === 'NETWORK' || e.code === 'TIMEOUT') return new FeedError('network', e.message);
    if (e.code === 'UNAUTHORIZED') return new FeedError('sessionExpired', e.message);
    return new FeedError('unknown', e.message);
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new FeedError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
