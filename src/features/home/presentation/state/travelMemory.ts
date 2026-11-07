import { useSyncExternalStore } from 'react';

import { addRecent, sameCity } from '../../domain/rules/travelRules';

/**
 * What Travel remembers for this run of the app — never where the feed is.
 * The server holds the teleport (`POST /me/teleport`) and the feed says when
 * it is in force (`citySource: 'teleport'`); this only fills in what the API
 * has no call for:
 *
 *   - `home`: the city the feed last chose without a teleport, so Travel can
 *     name "Your city". Unknown when the app opens already teleported.
 *   - `recent`: the last few cities teleported to, newest first ("Recent").
 */

export type RememberedCity = { id: string; name: string; countryCode: string; countryName?: string };

export type TravelMemory = { home: RememberedCity | null; recent: RememberedCity[] };

const EMPTY: TravelMemory = { home: null, recent: [] };

let state: TravelMemory = EMPTY;
const listeners = new Set<() => void>();

function set(next: TravelMemory) {
  state = next;
  listeners.forEach((l) => l());
}

export const travelMemory = {
  get: () => state,

  /** Recorded by the feed whenever a page comes back for a city that is not a teleport. */
  setHome: (home: RememberedCity) => {
    if (!sameCity(state.home, home)) set({ ...state, home });
  },

  /** After a teleport lands. */
  addRecent: (city: RememberedCity) => set({ ...state, recent: addRecent(state.recent, city) }),

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
