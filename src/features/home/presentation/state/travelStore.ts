import { useSyncExternalStore } from 'react';

import type { TravelCity } from '../../domain/entities/Feed';

/**
 * Where the feed is pointed (Travel Pro), the person's own city, and the
 * cities they travelling to lately — app-wide and for this run of the app.
 *
 *   - `destination`: null at home; a city while travelling.
 *   - `home`: the city the feed resolved when not travelling (the server picks it).
 *   - `recent`: the last few destinations, newest first ("Recent" in the picker).
 */

export type TravelState = {
  destination: TravelCity | null;
  home: TravelCity | null;
  recent: TravelCity[];
};

const MAX_RECENT = 3;

let state: TravelState = { destination: null, home: null, recent: [] };
const listeners = new Set<() => void>();

function set(next: TravelState) {
  state = next;
  listeners.forEach((l) => l());
}

const same = (a: TravelCity | null, b: TravelCity | null) => !!a && !!b && a.name === b.name;

export const travelStore = {
  get: () => state,

  /** Recorded by the feed whenever it loads the home city. */
  setHome: (home: TravelCity) => {
    if (!same(state.home, home)) set({ ...state, home });
  },

  travelTo: (city: TravelCity) => {
    if (same(city, state.home)) return travelStore.returnHome();
    set({
      ...state,
      destination: city,
      recent: [city, ...state.recent.filter((c) => !same(c, city))].slice(0, MAX_RECENT),
    });
  },

  returnHome: () => set({ ...state, destination: null }),

  /** Signing out forgets it all. */
  reset: () => set({ destination: null, home: null, recent: [] }),

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTravel(): TravelState {
  return useSyncExternalStore(travelStore.subscribe, travelStore.get);
}
