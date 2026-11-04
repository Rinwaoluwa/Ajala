import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { Bbox, PostType } from '../../domain/entities/Explore';
import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { visiblePins } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * View model for the map's pins (API map §7): `GET /map/pins` for the box the
 * map has settled on, one type or all. The box comes from the map's
 * "region change complete", so a pan asks once, when it stops.
 *
 * The last box's pins stay on the map while the next box loads, so pins never
 * blink out during a pan. "Happening today" narrows them on the phone.
 */
export function useMapPins(bbox: Bbox | null, type: PostType | null, todayOnly: boolean) {
  const { loadPins } = useExploreUseCases();
  // Today's date for the filter; re-read whenever the filter is turned on.
  const [now, setNow] = useState(() => new Date());
  const [lastToday, setLastToday] = useState(todayOnly);
  if (todayOnly !== lastToday) {
    setLastToday(todayOnly);
    if (todayOnly) setNow(new Date());
  }

  const query = useQuery({
    queryKey: bbox ? exploreKeys.pins(bbox, type) : ['explore', 'pins', 'none'],
    queryFn: () => loadPins(bbox!, type),
    enabled: bbox !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const pins = useMemo(
    () => visiblePins(query.data?.pins ?? [], todayOnly, now),
    [query.data, todayOnly, now],
  );
  const error: ExploreErrorCode | null = query.error
    ? isExploreError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  return {
    pins,
    /** Loaded at least once for some box; an empty map then means "nothing here". */
    loaded: query.isSuccess,
    fetching: query.isFetching,
    error,
    retry: () => void query.refetch(),
  };
}
