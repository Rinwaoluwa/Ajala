import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { Bbox, PostType } from '../../domain/entities/Explore';
import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { needsPrices, outsideReach, visiblePins, type MapFilters } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * View model for the map's pins (API map §7): `GET /map/pins` for the box the
 * map has settled on, one type or all. The box comes from the map's
 * "region change complete", so a pan asks once, when it stops.
 *
 * The last box's pins stay on the map while the next box loads, so pins never
 * blink out during a pan. The Filters sheet's date and price narrow them on the
 * phone: `GET /map/pins` takes neither. Pins carry no price, so while a price
 * filter is on each post's price is read from the feed (`loadPrices`), and a pin
 * it does not cover is left out.
 *
 * Each answer says where the server looks (`origin`: a teleport, or the
 * phone) and how far its pins reach (`reach`). A free reader (`radius`) only
 * gets pins within 30 km of the origin, so `outsideReach` is true when the box
 * is beyond that: the screen offers Teleport instead of "nothing here".
 * Subscribers (`box`) get every pin in the box. Without a location or a
 * teleport the answer is 404 NO_LOCATION (`error: 'noLocation'`).
 *
 * `titleFilter` is the API's `q` (pins whose title contains it). The map has no
 * field for it yet — its search moves the camera between cities — so the screen
 * passes nothing; it is here so a pin filter is one prop away.
 *
 * With an interest chosen (`interestId`, the chips over the map) the pins are
 * the posts with it, from the post search: `GET /map/pins` cannot filter by
 * interest. Search looks within 30 km of the origin whatever the box shows, so
 * the box is not sent, and the answer reads as `radius` reach (panning away
 * offers Teleport as it does for a free reader).
 */
export function useMapPins(
  bbox: Bbox | null,
  type: PostType | null,
  filters: MapFilters,
  titleFilter: string | null = null,
  interestId: string | null = null,
) {
  const { loadPins, loadPinsByInterest, loadPrices } = useExploreUseCases();
  // Today's date for the date filter; re-read whenever it changes.
  const [now, setNow] = useState(() => new Date());
  const [lastDate, setLastDate] = useState(filters.date);
  if (filters.date !== lastDate) {
    setLastDate(filters.date);
    setNow(new Date());
  }

  const priced = needsPrices(filters);
  const prices = useQuery({
    queryKey: exploreKeys.prices(type),
    queryFn: () => loadPrices(type),
    enabled: priced,
    staleTime: 60_000,
  });
  const priceMap = useMemo(
    () => (prices.data ? new Map(Object.entries(prices.data)) : null),
    [prices.data],
  );

  const query = useQuery({
    queryKey: interestId
      ? exploreKeys.pinsByInterest(interestId, type)
      : bbox
        ? exploreKeys.pins(bbox, type, titleFilter)
        : ['mapPins', 'none'],
    queryFn: () => (interestId ? loadPinsByInterest(interestId, type) : loadPins(bbox!, type, titleFilter)),
    enabled: interestId !== null || bbox !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const pins = useMemo(
    () => visiblePins(query.data?.pins ?? [], filters, now, priced ? priceMap : null),
    [query.data, filters, now, priced, priceMap],
  );
  const error: ExploreErrorCode | null = query.error
    ? isExploreError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  const answer = query.data ?? null;
  return {
    pins,
    /** Where the server looks, from the last answer; null before one. */
    origin: answer ? { ...answer.origin, source: answer.originSource } : null,
    /** The box is past a free reader's 30 km: its emptiness says nothing about what's there. */
    outsideReach: !!answer && !!bbox && !query.isPlaceholderData && outsideReach(answer, bbox),
    /** Loaded at least once for some box; an empty map then means "nothing here". */
    loaded: query.isSuccess,
    fetching: query.isFetching || (priced && prices.isFetching),
    error,
    /** A price filter is on but the prices could not be read: the map can't tell which pins match. */
    pricesFailed: priced && prices.isError && !prices.data,
    retry: () => {
      void query.refetch();
      if (priced) void prices.refetch();
    },
  };
}
