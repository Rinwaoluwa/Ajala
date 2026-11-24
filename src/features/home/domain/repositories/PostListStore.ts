/**
 * A list of posts someone marked, remembered on this phone. One is kept:
 * **hidden**, "Hide post" (the API has no way to hide one yet, backend request
 * B13). (A second, the posts someone liked, went when liking was taken out of
 * the app, 24 Nov.)
 *
 * It holds on this phone and does not follow the person to another. Kept per
 * account, so the next person to sign in on this phone starts with none.
 * Storage that fails remembers nothing, which is the safe way round: a post
 * shown again is better than a feed that will not load.
 *
 * When the API has hiding, this list goes, and the mark is read from the card
 * and sent to the server instead.
 */
export interface PostListStore {
  list(userId: string): Promise<string[]>;
  save(userId: string, postIds: readonly string[]): Promise<void>;
}

/** The most remembered in a list: posts pass, so the oldest marks can go. */
export const POST_LIST_MAX = 300;
