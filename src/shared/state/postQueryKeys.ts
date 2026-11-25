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
] as const;

/** A post's own page (post-detail's `postDetailKeys.post`). */
export const postPageKey = (postId: string) => ['postDetail', 'post', postId] as const;

/** A post's attendee lists, every state (post-detail's `postDetailKeys.attendeesOf`). */
export const postAttendeesKey = (postId: string) => ['postDetail', 'attendees', postId] as const;

/**
 * How many comments a post has, for a feed post's comment button. Home reads it
 * from the comments endpoint (cards carry no count yet), and the post page
 * writes its own total here, so the number on the feed follows a comment added
 * or deleted without asking again.
 */
export const postCommentCountKey = (postId: string) => ['post', 'commentCount', postId] as const;

/** Explore's mini card for a post. */
export const explorePostKey = (postId: string) => ['explore', 'post', postId] as const;

/** Saved and published drafts (settings' `settingsKeys.drafts`). */
export const DRAFTS_KEY = ['settings', 'drafts'] as const;

/** Settings' blocked people (`settingsKeys.blocked`). */
export const BLOCKED_KEY = ['settings', 'blocked'] as const;
