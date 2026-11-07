import { useSyncExternalStore } from 'react';

/**
 * What the person has just done to the bookmark on a post, by post id, for as
 * long as the app runs.
 *
 * The server's answer is `saved` on every post card (spec §6). But one post can
 * be on screen several times at once — the feed, the map sheet, the post page,
 * a profile — each drawn from a different cached query, and those caches do not
 * know about each other. Tapping the bookmark on one card writes here, and every
 * card showing that post reads here first, so they all flip together without
 * refetching every list.
 *
 * An entry stays until sign-out (`reset`): it is the latest thing the person
 * did, so it is at least as fresh as any cached card.
 */

const overrides = new Map<string, boolean>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const postSaves = {
  get(postId: string): boolean | undefined {
    return overrides.get(postId);
  },
  /** `undefined` forgets the entry, so the card falls back to the server's `saved`. */
  set(postId: string, saved: boolean | undefined) {
    if (saved === undefined) overrides.delete(postId);
    else overrides.set(postId, saved);
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

/** The person's latest choice for one post, or undefined when they have not touched it this run. */
export function useSavedOverride(postId: string): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => overrides.get(postId),
    () => undefined,
  );
}
