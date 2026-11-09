import type { Bbox, PostType } from '../../domain/entities/Explore';

/** Rounded to about 1 km, so a nudge of the map does not ask again. */
const boxKey = (b: Bbox) => [b.west, b.south, b.east, b.north].map((n) => n.toFixed(2)).join(',');

/**
 * The explore feature's TanStack Query keys.
 *
 * Anything that depends on where the server looks (a teleport, or the phone)
 * sits under the spec's prefixes (§7.4) — `mapPins`, `searchPosts`, `feed` —
 * not under `explore`:
 * Travel resets those three after a teleport or coming home, and this is how
 * Explore's answers are reset with them without either feature importing the
 * other's keys.
 */
export const exploreKeys = {
  pins: (bbox: Bbox, type: PostType | null, titleFilter: string | null) =>
    ['mapPins', boxKey(bbox), type ?? 'all', titleFilter ?? ''] as const,
  post: (postId: string) => ['explore', 'post', postId] as const,
  interests: ['explore', 'interests'] as const,
  /** No interest: the feed's meetups. With one: a search by it. */
  meetups: (interestId: string | null) =>
    interestId
      ? (['searchPosts', '', [interestId], 'meetup'] as const)
      : (['feed', 'explore-meetups'] as const),
  /** The list's search box: words only, every type. */
  search: (words: string) => ['searchPosts', words, [], 'all'] as const,
  /** The map's city search on the phone, by what was typed. */
  places: (query: string) => ['explore', 'places', query] as const,
  rsvpNotice: ['explore', 'rsvpNotice'] as const,
  /** The signed-in person's id. It never changes within a session, and signing out clears the cache. */
  me: ['explore', 'me'] as const,
};
