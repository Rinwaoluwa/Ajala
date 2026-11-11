import { useCallback, useState } from 'react';
import { haptics } from '../feedback/haptics';

/**
 * The spinner of a pull to refresh: on while the refresh the person pulled for
 * runs, and only then.
 *
 * Tying `RefreshControl` to a query's `isRefetching` shows the spinner for every
 * background refresh too — the one after an edit elsewhere, a bookmark, coming
 * back to the app — and on iOS that pushes the whole page down and back by
 * itself.
 */
export function usePullRefresh(run: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    // A light tap as the pull takes: the refresh has started.
    haptics.tap();
    setRefreshing(true);
    void run().finally(() => setRefreshing(false));
  }, [run]);
  return { refreshing, refresh };
}
