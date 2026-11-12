import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { FeedFilter, FeedPage } from '../../domain/entities/Feed';
import { isFeedError, type FeedErrorCode } from '../../domain/entities/FeedError';
import { shortPlaceName } from '../../domain/rules/travelRules';
import { feedKeys } from '../state/feedQueries';
import { travelMemory } from '../state/travelMemory';
import { useHomeUseCases } from '../state/useHomeUseCases';
import { useCityNameAt, usePlaceName } from './usePlaceName';
import { useTravelState } from './useTravelState';

/**
 * Where the header says the feed is looking.
 *
 * - `teleported`: a Travel teleport is in force; `label` is its full name
 *   ("Accra, Ghana") for "Teleported to …", `name` the short one ("Accra").
 * - otherwise the phone's own location: `name` is its city ("London", looked
 *   up from the feed's point), the region the server named ("England") until
 *   then or when no city is found, or null when neither is known (the header
 *   says "Near you").
 */
export type FeedPlace = { name: string | null; label: string | null; teleported: boolean };

/**
 * View model for the home feed (API map §4): an infinite query over
 * `GET /feed`, one per post-type filter, paged by cursor.
 *
 * The server picks where to look — a Travel teleport first (`originSource:
 * 'teleport'`), then the phone's location — so the key carries only the
 * filter; teleporting or coming home resets the cache (`useTravelMove`). With
 * neither, the feed answers 404 NO_LOCATION (`error: 'noLocation'`): the
 * screen asks for location or offers a place, rather than apologising.
 *
 * Cached per filter (TanStack Query): going back to a filter already seen draws
 * its cards at once and refreshes them behind. Pull to refresh refetches from
 * the first page; returning to the app refreshes a stale feed by itself.
 *
 *   - `loading`: no page yet for this filter — the skeleton shows;
 *   - `refreshing`: a pull to refresh in flight, cards still on screen;
 *   - `loadingMore`: the next page, when the list nears its end.
 *
 * The header's place comes from the first page — of this filter, or while it
 * loads, of any filter already cached. Before any page has landed (a fresh
 * start), a teleport the server already holds (`GET /me`, `useTravelState`)
 * names it, so the header says "Teleported to London" straight away rather
 * than a skeleton. `GET /me` gives only the teleport's place id, so its name
 * is looked up once (`usePlaceName`, cached for the run).
 */
export function useFeed() {
  const { loadFeed } = useHomeUseCases();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [pulling, setPulling] = useState(false);

  const travel = useTravelState();
  const query = useInfiniteQuery({
    queryKey: feedKeys.feed(filter),
    queryFn: async ({ pageParam }) => {
      const page = await loadFeed(filter, pageParam);
      return page;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // The server caches cards for 10 minutes; a minute here is plenty fresh.
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    // A card can move between pages while the feed updates; keep each once.
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((p) => !seen.has(p.id) && !!seen.add(p.id));
  }, [query.data]);

  // A filter not loaded yet still has a place to show: any feed already cached.
  const first =
    query.data?.pages[0] ??
    queryClient
      .getQueriesData<InfiniteData<FeedPage>>({ queryKey: feedKeys.lists })
      .map(([, data]) => data?.pages[0])
      .find(Boolean);
  const error: FeedErrorCode | null = query.error
    ? isFeedError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  // Only looked up when the feed can't name the teleport itself.
  const teleportId = travel?.teleport?.placeId ?? null;
  const needsName = teleportId !== null && !(first?.originSource === 'teleport' && first.origin.label);
  const teleportName = usePlaceName(needsName ? teleportId : null);

  // The phone's own location: its city ("London"), not the region the feed names ("England").
  const devicePoint = first?.originSource === 'device' ? first.origin : null;
  const city = useCityNameAt(devicePoint ? { lat: devicePoint.lat, lng: devicePoint.lng } : null);
  // Names "Where you are" in Travel while teleported later: the city, or the region until it is known.
  const here = city ?? devicePoint?.region ?? null;
  useEffect(() => {
    travelMemory.setHere(here);
  }, [here]);

  const place: FeedPlace | null = first
    ? first.originSource === 'teleport'
      ? named(first.origin.label ?? teleportName)
      : { name: city ?? first.origin.region, label: null, teleported: false }
    : teleportName
      ? named(teleportName)
      : null;

  return {
    filter,
    items,
    place,
    loading: query.isPending,
    refreshing: pulling && query.isRefetching,
    loadingMore: query.isFetchingNextPage,
    error,
    setFilter,
    refresh: () => {
      setPulling(true);
      void query.refetch().finally(() => setPulling(false));
    },
    retry: () => void query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}

const named = (label: string | null): FeedPlace => ({
  name: label ? shortPlaceName(label) : null,
  label,
  teleported: true,
});
