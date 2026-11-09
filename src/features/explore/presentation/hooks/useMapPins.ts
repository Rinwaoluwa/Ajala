import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { Bbox, PostType } from '../../domain/entities/Explore';
import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { outsideReach, visiblePins } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * View model for the map's pins (API map §7): `GET /map/pins` for the box the
 * map has settled on, one type or all. The box comes from the map's
 * "region change complete", so a pan asks once, when it stops.
 *
 * The last box's pins stay on the map while the next box loads, so pins never
 * blink out during a pan. "Happening today" narrows them on the phone.
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
 */
export function useMapPins(
  bbox: Bbox | null,
  type: PostType | null,
  todayOnly: boolean,
  titleFilter: string | null = null,
) {
  const { loadPins } = useExploreUseCases();
  // Today's date for the filter; re-read whenever the filter is turned on.
  const [now, setNow] = useState(() => new Date());
  const [lastToday, setLastToday] = useState(todayOnly);
  if (todayOnly !== lastToday) {
    setLastToday(todayOnly);
    if (todayOnly) setNow(new Date());
  }

  const query = useQuery({
    queryKey: bbox ? exploreKeys.pins(bbox, type, titleFilter) : ['mapPins', 'none'],
    queryFn: () => loadPins(bbox!, type, titleFilter),
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

  const answer = query.data ?? null;
  return {
    pins,
    /** Where the server looks, from the last answer; null before one. */
    origin: answer ? { ...answer.origin, source: answer.originSource } : null,
    /** The box is past a free reader's 30 km: its emptiness says nothing about what's there. */
    outsideReach: !!answer && !!bbox && !query.isPlaceholderData && outsideReach(answer, bbox),
    /** Loaded at least once for some box; an empty map then means "nothing here". */
    loaded: query.isSuccess,
    fetching: query.isFetching,
    error,
    retry: () => void query.refetch(),
  };
}
