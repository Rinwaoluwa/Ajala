import { useSyncExternalStore } from 'react';

import type { TravelCity } from '../../domain/entities/Feed';
import { addRecent } from '../../domain/rules/travelRules';

/**
 * What Travel remembers for this run of the app — never where the feed is.
 * The server holds the teleport (`POST /me/teleport`) and the feed says when
 * it is in force (`originSource: 'teleport'`); this only fills in what the API
 * has no call for:
 *
 *   - `here`: the region the feed last named for the phone's own location
 *     ("Lagos"), so "Where you are" in Travel has a name while teleported.
 *   - `recent`: the last few cities teleported to, newest first ("Recent").
 *     Swagger has no popular-cities list, so this and search are what Travel
 *     offers.
 */

export type TravelMemory = { here: string | null; recent: TravelCity[] };

const EMPTY: TravelMemory = { here: null, recent: [] };

let state: TravelMemory = EMPTY;
const listeners = new Set<() => void>();

function set(next: TravelMemory) {
  state = next;
  listeners.forEach((l) => l());
}

export const travelMemory = {
  get: () => state,

  /** Recorded by the feed whenever a page comes back for the phone's own location. */
  setHere: (here: string | null) => {
    if (here && here !== state.here) set({ ...state, here });
  },

  /** After a teleport lands. */
  addRecent: (city: TravelCity) => set({ ...state, recent: addRecent(state.recent, city) }),

  /** Signing out forgets it all. */
  reset: () => set(EMPTY),

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTravelMemory(): TravelMemory {
  return useSyncExternalStore(travelMemory.subscribe, travelMemory.get);
}
