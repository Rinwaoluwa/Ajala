import { useSyncExternalStore } from 'react';

/** Where the person stands on a post (`RsvpState`, spec §6). */
export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';

/**
 * What the person has just done about joining a post, by post id, for as long
 * as the app runs — the RSVP twin of `postSaves`.
 *
 * One post can be on screen several times at once (the feed, the map sheet, a
 * profile), each drawn from a different cached query. Joining from one card
 * writes here, and every card showing that post reads here first, so they all
 * agree without refetching every list. The post page reads the server afresh
 * when it opens, so it is never behind.
 */

const overrides = new Map<string, RsvpState>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const postRsvps = {
  get(postId: string): RsvpState | undefined {
    return overrides.get(postId);
  },
  /** `undefined` forgets the entry, so the card falls back to the server's `rsvpState`. */
  set(postId: string, state: RsvpState | undefined) {
    if (state === undefined) overrides.delete(postId);
    else overrides.set(postId, state);
    emit();
  },
  /** Signing out forgets them, like every other trace of the account. */
  reset() {
    overrides.clear();
    emit();
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useRsvpOverride(postId: string): RsvpState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => overrides.get(postId),
    () => undefined,
  );
}
