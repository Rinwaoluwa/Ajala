/**
 * The query keys that show posts, by prefix, for whatever changes a post (an
 * RSVP, a publish, an edit, a cancel, a block) to refresh in one place.
 *
 * Each feature owns its own key factory; these are only the prefixes those
 * factories start with, written out here because shared code and other
 * features may not import a feature's keys. A test checks they still match.
 */
export const POST_LIST_PREFIXES = [
  ['feed'],
  ['explore'],
  ['mapPins'],
  ['searchPosts'],
  ['trips'],
  ['saved'],
  ['profile', 'activity'],
  ['profile', 'rsvps'],
] as const;

/** A post's own page (post-detail's `postDetailKeys.post`). */
export const postPageKey = (postId: string) => ['postDetail', 'post', postId] as const;

/** A post's attendee lists, every state (post-detail's `postDetailKeys.attendeesOf`). */
export const postAttendeesKey = (postId: string) => ['postDetail', 'attendees', postId] as const;

/** Explore's mini card for a post. */
export const explorePostKey = (postId: string) => ['explore', 'post', postId] as const;

/** Saved and published drafts (settings' `settingsKeys.drafts`). */
export const DRAFTS_KEY = ['settings', 'drafts'] as const;

/** Settings' blocked people (`settingsKeys.blocked`). */
export const BLOCKED_KEY = ['settings', 'blocked'] as const;
