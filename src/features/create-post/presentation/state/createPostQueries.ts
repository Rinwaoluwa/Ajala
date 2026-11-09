/** The create wizard's TanStack Query keys, under `createPost` so they never meet another feature's. */
export const createPostKeys = {
  interests: ['createPost', 'interests'] as const,
  /** One place search: what is looked for, the words, and the area it leans towards. */
  places: (kind: 'cities' | 'places', query: string, near: string) =>
    ['createPost', 'places', kind, query, near] as const,
  /** A picked place's details; a place id's answer doesn't change while the wizard is open. */
  place: (placeId: string) => ['createPost', 'place', placeId] as const,
  /** A saved draft being carried on with; read once, never cached past the wizard. */
  draft: (postId: string) => ['createPost', 'draft', postId] as const,
};

/**
 * Lists a new post can appear in, refreshed after one is published. The home
 * feed and Explore own these keys; only their prefixes are named here.
 */
export const LISTS_A_NEW_POST_JOINS = [['feed'], ['explore']] as const;
