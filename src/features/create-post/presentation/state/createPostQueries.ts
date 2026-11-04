/** The create wizard's TanStack Query keys, under `createPost` so they never meet another feature's. */
export const createPostKeys = {
  interests: ['createPost', 'interests'] as const,
  cities: (query: string) => ['createPost', 'cities', query] as const,
  /** A saved draft being carried on with; read once, never cached past the wizard. */
  draft: (postId: string) => ['createPost', 'draft', postId] as const,
};

/**
 * Lists a new post can appear in, refreshed after one is published. The home
 * feed and Explore own these keys; only their prefixes are named here.
 */
export const LISTS_A_NEW_POST_JOINS = [['feed'], ['explore']] as const;
