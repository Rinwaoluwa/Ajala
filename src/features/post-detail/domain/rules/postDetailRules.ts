import type { PostDetail, RsvpResult } from '../entities/PostDetail';

/**
 * What the post page's main button is, from the post as the API last described
 * it (spec §2.13). The server decides; this only names the state it is in.
 */
export type JoinAction =
  /** Open post with room: join at once. */
  | 'join'
  /** Private post: ask the host. */
  | 'request'
  /** Full, but a waiting list is open. */
  | 'joinWaitlist'
  /** A paid Event: open its link to pay or book. */
  | 'book'
  | 'requested'
  | 'going'
  | 'waitlisted'
  /** Full, no waiting list: the disabled "Event full". */
  | 'full'
  | 'started'
  /** Over, and the viewer was going: "✓ You went" (nothing to leave any more). */
  | 'attended'
  | 'cancelled'
  /** The viewer hosts it. */
  | 'host'
  /** Declined or removed: no button at all. */
  | 'none';

export const isFull = (p: Pick<PostDetail, 'capacity' | 'goingCount'>) =>
  p.capacity !== null && p.goingCount >= p.capacity;

/** "4 of 12 spots left"; null without a limit. */
export const spotsLeft = (p: Pick<PostDetail, 'capacity' | 'goingCount'>) =>
  p.capacity === null ? null : Math.max(0, p.capacity - p.goingCount);

export function joinAction(post: PostDetail, now: Date = new Date()): JoinAction {
  if (post.isHost) return 'host';
  if (post.status === 'cancelled') return 'cancelled';
  // Once it has started there is nothing to join or leave.
  if (post.startAt && new Date(post.startAt).getTime() <= now.getTime()) {
    return post.rsvpState === 'going' ? 'attended' : 'started';
  }
  switch (post.rsvpState) {
    case 'going':
      return 'going';
    case 'requested':
      return 'requested';
    case 'waitlisted':
      return 'waitlisted';
    case 'declined':
    case 'removed':
      return 'none';
    case 'none':
      break;
  }
  if (post.joinMode === 'external') return 'book';
  if (post.visibility === 'private') return 'request';
  if (isFull(post)) return post.waitlistEnabled ? 'joinWaitlist' : 'full';
  return 'join';
}

/**
 * The page right after tapping Join, before the API answers: what it will most
 * likely say, so the button and the count change at once. Corrected by the
 * answer, undone on an error.
 */
export function expectJoin(post: PostDetail): PostDetail {
  if (post.visibility === 'private') return { ...post, rsvpState: 'requested' };
  if (isFull(post)) return { ...post, rsvpState: 'waitlisted' };
  return { ...post, rsvpState: 'going', goingCount: post.goingCount + 1 };
}

/** The page right after leaving (or withdrawing a request). */
export function expectLeave(post: PostDetail): PostDetail {
  return {
    ...post,
    rsvpState: 'none',
    waitlistPosition: null,
    goingCount: post.rsvpState === 'going' ? Math.max(0, post.goingCount - 1) : post.goingCount,
  };
}

/** The page once the API answered a join or leave. */
export function withRsvp(post: PostDetail, r: RsvpResult): PostDetail {
  return {
    ...post,
    rsvpState: r.state,
    goingCount: r.goingCount,
    capacity: r.capacity,
    waitlistPosition: r.waitlistPosition,
  };
}

/** Where the "Share" link points; the deep-link files make it open the app (API map §11). */
export const LINKS_HOST = 'https://ajalatrvl.com';
export const postLink = (postId: string) => `${LINKS_HOST}/posts/${encodeURIComponent(postId)}`;
