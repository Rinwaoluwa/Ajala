import type { PostDetail, RsvpResult } from '../entities/PostDetail';

/**
 * The post as the signed-in person sees it. The API asks every card to compare
 * `host.id` with the viewer's own id (backend answers B9): on your own post it
 * says `rsvpState: 'none'` and Join answers 409, so it is marked as yours and
 * gets "Manage post" instead. Until the id is known, the server's `isHost` stands.
 */
export function asSeenBy(post: PostDetail, viewerId: string | null): PostDetail {
  if (post.isHost || !viewerId || post.host.id !== viewerId) return post;
  return { ...post, isHost: true };
}

/**
 * Which chat buttons sit beside the host's name. Group chats are automatic (one
 * is made when a post goes live, and everyone going is in it), so "Group chat"
 * is for the host and the people going, and nobody else. Anyone but the host may
 * "Message" them. A cancelled post's chat is removed for everyone, so a post that
 * is not live has neither.
 */
export function chatActions(post: PostDetail): { groupChat: boolean; messageHost: boolean } {
  if (post.status !== 'published') return { groupChat: false, messageHost: false };
  return {
    groupChat: post.isHost || post.rsvpState === 'going',
    messageHost: !post.isHost,
  };
}

/**
 * What the post page's main button is, from the post as the API last described
 * it (spec §2.13). The server decides; this only names the state it is in. Every
 * post joins by RSVP; one with a link opens it as it joins (see `usePostDetail`).
 */
export type JoinAction =
  /** Open post with room: join at once. */
  | 'join'
  /** Private post: ask the host. */
  | 'request'
  /** Full, but a waiting list is open. */
  | 'joinWaitlist'
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

/**
 * Where the "Share" link points: `https://<links host>/posts/{id}` (backend
 * answers D3). The same variable and default as `@core/config/links`, read here
 * directly because Domain may not import `@core`.
 */
export const LINKS_HOST = `https://${process.env.EXPO_PUBLIC_LINKS_HOST?.trim() || 'go.ajalatrvl.com'}`;
export const postLink = (postId: string) => `${LINKS_HOST}/posts/${encodeURIComponent(postId)}`;
