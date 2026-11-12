import { isCancelledError, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { isCreatePostError } from '../../domain/entities/CreatePostError';
import type { Coordinates, DraftPlace, PlaceOption, PlaceSearchKind } from '../../domain/entities/PostDraft';
import { PLACE_QUERY_MIN } from '../../domain/usecases/CreatePostUseCases';
import { createPostKeys } from '../state/createPostQueries';
import { useOwnAreaOnly } from '../state/ownArea';
import { useCreatePostUseCases } from '../state/useCreatePostUseCases';

/** About a kilometre: close enough that moving the bias point that little isn't a new search. */
const nearKey = (near: Coordinates | null) => (near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : '');

/**
 * A place picker's search (Google, through `@core/places`): cities for a Plan's
 * or Group's destination, any place for a meeting point.
 *
 * - A free member sees only places around the phone (`OwnAreaOnlyContext`,
 *   MOB-077); the server refuses their posts anywhere else.
 * - Searched once the person pauses typing (300ms), from two letters; each
 *   search is a cached query, so going back over the same letters answers at
 *   once. A search overtaken by the next keystroke is cancelled (TanStack hands
 *   the query its AbortSignal, which goes all the way to Google).
 * - `pick` reads the suggestion's details (name, address, coordinates), also
 *   as a query, so the same place picked twice is not looked up twice.
 * - Google bills a search as one session ending in a details call. When the
 *   picker goes away without a pick, the session is ended so the next search
 *   doesn't bill as part of this one.
 */
export function usePlaceSearch(kind: PlaceSearchKind, near: Coordinates | null = null) {
  const { searchPlaces, placeDetails, endPlaceSearch } = useCreatePostUseCases();
  // A free member: only places around the phone, as the server allows them to post nowhere else.
  const ownAreaOnly = useOwnAreaOnly();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const settled = useDebouncedValue(query.trim(), 300);
  // Clearing the field hides the list at once, without waiting out the debounce.
  const enabled = settled.length >= PLACE_QUERY_MIN && query.trim().length >= PLACE_QUERY_MIN;

  const results = useQuery({
    queryKey: createPostKeys.places(kind, settled.toLowerCase(), nearKey(near), ownAreaOnly),
    queryFn: ({ signal }) => searchPlaces(kind, settled, near, signal, ownAreaOnly),
    enabled,
    staleTime: 10 * 60_000,
    // Search being down is not fixed by asking again straight away.
    retry: (count, e) => !(isCreatePostError(e) && e.code === 'placesUnavailable') && count < 1,
  });

  // A search was made and nothing picked yet: the session is still open.
  const sessionOpen = useRef(false);
  useEffect(() => {
    if (enabled) sessionOpen.current = true;
  }, [enabled, settled]);

  const [picking, setPicking] = useState<string | null>(null);
  const [pickFailed, setPickFailed] = useState(false);

  const pick = useCallback(
    async (option: PlaceOption): Promise<DraftPlace | null> => {
      setPicking(option.placeId);
      setPickFailed(false);
      try {
        const place = await queryClient.fetchQuery({
          queryKey: createPostKeys.place(option.placeId),
          queryFn: ({ signal }) => placeDetails(option.placeId, signal),
          staleTime: Infinity,
        });
        setQuery('');
        return { ...place, name: place.name || option.name, address: place.address || option.detail };
      } catch (e) {
        // Cancelled because the picker went away: nothing to say.
        if (!isCancelledError(e)) setPickFailed(true);
        return null;
      } finally {
        // A details call ends the session; a cached answer made none, so end it here too.
        sessionOpen.current = false;
        endPlaceSearch();
        setPicking(null);
      }
    },
    [queryClient, placeDetails, endPlaceSearch],
  );

  // The picker closing (its step left, a type switched) without a pick.
  useEffect(
    () => () => {
      void queryClient.cancelQueries({ queryKey: ['createPost', 'place'] });
      if (sessionOpen.current) endPlaceSearch();
    },
    [queryClient, endPlaceSearch],
  );

  return {
    query,
    setQuery: (text: string) => {
      setQuery(text);
      setPickFailed(false);
    },
    /** Fewer than two letters: nothing is searched, and no list shows. */
    tooShort: !enabled,
    results: enabled ? (results.data ?? []) : [],
    loading: enabled && results.isPending,
    /** The place id being looked up after a tap. */
    picking,
    /**
     * Search, or the lookup after a tap, failed. Every cause (no key, Google
     * down, offline) reads "Place search isn't available right now".
     */
    failed: (enabled && results.isError) || pickFailed,
    pick,
  };
}
