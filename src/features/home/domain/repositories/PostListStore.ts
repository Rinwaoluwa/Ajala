/**
 * A list of posts someone marked, remembered on this phone. Two are kept:
 *
 *   - **hidden**: "Hide post" (the API has no way to hide one yet, backend
 *     request B13);
 *   - **liked**: the heart (the API has no likes at all yet, backend request
 *     B12). A like kept here shows only to the person who gave it: the host
 *     never sees it, and there is no count.
 *
 * Both hold on this phone and do not follow the person to another. Kept per
 * account, so the next person to sign in on this phone starts with none.
 * Storage that fails remembers nothing, which is the safe way round: a post
 * shown again, or a heart that has emptied, is better than a feed that will
 * not load.
 *
 * When the API has likes or hiding, the list it replaces goes, and the mark is
 * read from the card and sent to the server instead.
 */
export interface PostListStore {
  list(userId: string): Promise<string[]>;
  save(userId: string, postIds: readonly string[]): Promise<void>;
}

/** The most remembered in a list: posts pass, so the oldest marks can go. */
export const POST_LIST_MAX = 300;
