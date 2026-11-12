import { POST_LIST_PREFIXES } from '@shared/state/postQueryKeys';

/** The create wizard's TanStack Query keys, under `createPost` so they never meet another feature's. */
export const createPostKeys = {
  interests: ['createPost', 'interests'] as const,
  /** One place search: what is looked for, the words, and the area it leans towards. */
  places: (kind: 'cities' | 'places', query: string, near: string, ownAreaOnly = false) =>
    ['createPost', 'places', kind, query, near, ownAreaOnly ? 'ownArea' : 'anywhere'] as const,
  /** A picked place's details; a place id's answer doesn't change while the wizard is open. */
  place: (placeId: string) => ['createPost', 'place', placeId] as const,
  /** A saved draft being carried on with; read once, never cached past the wizard. */
  draft: (postId: string) => ['createPost', 'draft', postId] as const,
};

/**
 * Lists a new or edited post can appear in, refreshed after it is published:
 * the feed, the map and search, Trips, Saved and the profile's lists.
 */
export const LISTS_A_NEW_POST_JOINS = POST_LIST_PREFIXES;
