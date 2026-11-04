import type { FeedFilter } from '../../domain/entities/Feed';

/** The home feature's TanStack Query keys. */
export const feedKeys = {
  /** Every filter's feed. */
  lists: ['feed', 'list'] as const,
  /** One feed per filter and per place: home (`null`) or a Travel destination. */
  feed: (filter: FeedFilter, destination: string | null) =>
    ['feed', 'list', destination ?? 'home', filter] as const,
  /** Under `feed`, not shared: another feature maps `/cities` to a different shape. */
  cities: (query: string) => ['feed', 'cities', query] as const,
};
