/**
 * The searches someone ran in the Explore list, kept on this phone for the
 * account that ran them, most recent first. They are offered again when the
 * search box is opened, so a repeat search is one tap.
 *
 * On the phone, not the server: the API keeps no search history, and what
 * someone looked for is theirs.
 */
export type RecentSearchStore = {
  list(userId: string): Promise<string[]>;
  save(userId: string, searches: readonly string[]): Promise<void>;
};
