import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { TripCard, TripsTab } from '../../domain/entities/Trip';
import { isTripsError, type TripsErrorCode } from '../../domain/entities/TripsError';
import { mergeUpcoming } from '../../domain/rules/tripRules';
import { tripsKeys, type TripsSource } from '../state/tripsQueries';
import { useTripsUseCases } from '../state/useTripsUseCases';

/** A page of any Trips list; the Requests tab's cursor says which list it is in, so it is generic. */
type Page<C> = { items: TripCard[]; nextCursor: C | null };

/** One cursor-paged list, cached under its own key; fetched only while its tab shows. */
function usePagedTrips<C>(source: TripsSource, load: (cursor: C | null) => Promise<Page<C>>, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: tripsKeys.list(source),
    // TanStack cannot carry a generic cursor type through to `pageParam`; it is always ours.
    queryFn: ({ pageParam }) => load(pageParam as C | null),
    initialPageParam: null as C | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

const flatten = (pages: readonly { items: TripCard[] }[] | undefined) => {
  const seen = new Set<string>();
  return (pages ?? []).flatMap((p) => p.items).filter((t) => !seen.has(t.id) && !!seen.add(t.id));
};

/**
 * View model for one Trips list (spec §2.16, API map §8). Each source is an
 * infinite query paged by cursor and cached, so switching tabs back is instant.
 *
 *   - Upcoming: posts I'm going to (`/me/rsvps?state=going`) merged with posts I
 *     host that haven't ended (`/me/posts`, filtered on the phone), soonest
 *     first. A hosted page can filter down to nothing; when nothing shows yet
 *     the next page is fetched by itself rather than saying "no plans" too soon.
 *   - Requests: everything I'm waiting to get into — private posts I asked to
 *     join (`/me/rsvps?state=requested`), then full posts whose waitlist I'm on
 *     (`state=waitlisted`), one query that reads the two lists in turn.
 *   - Past: what I went to (`/me/attended`), latest first.
 *
 * All four queries are always declared (hooks cannot be conditional); only the
 * ones behind the current tab are enabled.
 */
export function useTripList(tab: TripsTab) {
  const { loadGoing, loadHostedUpcoming, loadWaiting, loadPast } = useTripsUseCases();
  const [pulling, setPulling] = useState(false);

  const going = usePagedTrips('going', loadGoing, tab === 'upcoming');
  const hosted = usePagedTrips('hosted', loadHostedUpcoming, tab === 'upcoming');
  const waiting = usePagedTrips('waiting', loadWaiting, tab === 'requests');
  const past = usePagedTrips('past', loadPast, tab === 'past');

  const sources = tab === 'upcoming' ? [going, hosted] : tab === 'requests' ? [waiting] : [past];

  const goingComplete = going.isSuccess && !going.hasNextPage;
  const shownPages = tab === 'requests' ? waiting.data?.pages : past.data?.pages;
  const items: TripCard[] = useMemo(
    () =>
      tab === 'upcoming'
        ? mergeUpcoming(flatten(going.data?.pages), flatten(hosted.data?.pages), goingComplete)
        : flatten(shownPages),
    [tab, going.data, hosted.data, goingComplete, shownPages],
  );

  const anyPending = sources.some((q) => q.isPending);
  const anyNext = sources.some((q) => q.hasNextPage);
  const fetchingNext = sources.some((q) => q.isFetchingNextPage);
  const allSettled = sources.every((q) => !q.isPending);


  const fetchMore = () => {
    for (const q of sources) if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
  };

  // Keep paging while everything loaded so far is filtered out (past hosted posts).
  useEffect(() => {
    if (allSettled && items.length === 0 && anyNext && !fetchingNext) fetchMore();
    // `fetchMore` reads the latest `sources` each render; the flags above are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSettled, items.length, anyNext, fetchingNext]);

  // A list that partly loaded shows what it has; the failure shows only when nothing did.
  const failed = sources.find((q) => q.error)?.error;
  const error: TripsErrorCode | null = failed ? (isTripsError(failed) ? failed.code : 'unknown') : null;

  return {
    items,
    loading: anyPending || (items.length === 0 && anyNext && !error),
    refreshing: pulling && sources.some((q) => q.isRefetching),
    loadingMore: fetchingNext,
    error,
    refresh: () => {
      setPulling(true);
      void Promise.all(sources.map((q) => q.refetch())).finally(() => setPulling(false));
    },
    retry: () => {
      for (const q of sources) if (q.error) void q.refetch();
    },
    loadMore: fetchMore,
  };
}
