import type { FeedFilter } from '../../domain/entities/Feed';

/** The home feature's TanStack Query keys. */
export const feedKeys = {
  /** Every filter's feed. */
  lists: ['feed', 'list'] as const,
  feed: (filter: FeedFilter) => ['feed', 'list', filter] as const,
  /** Under `feed`, not shared: another feature maps `/cities` to a different shape. */
  cities: (query: string) => ['feed', 'cities', query] as const,
};
