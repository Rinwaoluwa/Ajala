import { isApiError } from '@core/api/ApiError';

import type { CatalogCity, FeedPage, PostCard } from '../../domain/entities/Feed';
import { FeedError } from '../../domain/entities/FeedError';
import type { CityDto, FeedPageDto, PostCardDto } from '../dto/feedDtos';

export function toPostCard(dto: PostCardDto): PostCard {
  const image = dto.images?.[0];
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    imageUrl: image?.cardUrl ?? null,
    startAt: dto.startAt ?? null,
    placeName: dto.placeName ?? null,
    host: { name: dto.host.displayName, avatarUrl: dto.host.avatarUrl ?? null, verified: dto.host.verified },
    distanceKm: dto.distanceKm ?? null,
    goingCount: dto.goingCount ?? 0,
    capacity: dto.capacity ?? null,
    price: dto.price
      ? { amount: dto.price.amountCents / 10 ** dto.price.exponent, currency: dto.price.currency }
      : null,
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

/** By the API's code (spec §5), never its message. */
export function toFeedError(e: unknown): FeedError {
  if (e instanceof FeedError) return e;
  if (isApiError(e)) {
    if (e.code === 'NO_CITY') return new FeedError('noCity', e.message);
    if (e.code === 'NETWORK' || e.code === 'TIMEOUT') return new FeedError('network', e.message);
    if (e.code === 'UNAUTHORIZED') return new FeedError('sessionExpired', e.message);
    return new FeedError('unknown', e.message);
  }
  const code = (e as { code?: unknown } | null)?.code;
  return new FeedError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
}
