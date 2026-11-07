import { DEMO_HOSTS } from '../demoData';
import { DAY, fail, page, registerReset, store, type DemoRoute } from '../demoStore';

/**
 * Demo answers for the notifications inbox (spec §2.17): `GET /me/notifications`
 * and marking read; and push devices (spec §2.10), which the demo accepts and
 * forgets, since it never sends a push (see docs/DEMO.md for trying one). One of each of the eight categories, newest first, each
 * pointing at a real demo post (or chat) so tapping it opens something. The
 * newest four start unread, for the badge.
 */

type Category =
  | 'join_request'
  | 'request_accepted'
  | 'post_reminder'
  | 'new_comment'
  | 'new_message'
  | 'subscription'
  | 'post_update'
  | 'moderation';

type DemoNotification = {
  id: string;
  category: Category;
  title: string;
  body: string;
  data: { kind?: string; postId?: string; [k: string]: unknown };
  readAt: string | null;
  createdAt: string;
};

const MINUTE = 60_000;
const name = (i: number) => DEMO_HOSTS[i]?.displayName ?? 'Someone';

/** Built when the world starts, so the times are relative to now. */
function seed(): DemoNotification[] {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const unread = (createdAt: string) => ({ readAt: null, createdAt });
  const read = (createdAt: string) => ({ readAt: createdAt, createdAt });
  return [
    {
      id: 'n-join-request',
      category: 'join_request',
      title: 'New request to join',
      body: 'Biodun wants to join Sunset Rooftop Hangout.',
      data: { kind: 'join_request', postId: 'p-my-rooftop' },
      ...unread(ago(12 * MINUTE)),
    },
    {
      id: 'n-new-message',
      category: 'new_message',
      title: 'Lagos Weekend Crew',
      body: 'Kofi: Is anyone sharing a boat from the jetty?',
      // The Tarkwa Bay group chat (routes/chat.ts), so the tap opens the thread itself.
      data: {
        kind: 'message',
        postId: 'p-tarkwa',
        conversationId: 'c-lagos-crew',
      },
      ...unread(ago(40 * MINUTE)),
    },
    {
      id: 'n-post-reminder',
      category: 'post_reminder',
      title: 'Starting soon',
      body: 'Golden Hour Photo Walk starts tomorrow at Freedom Park.',
      data: { kind: 'post_reminder', postId: 'p-photo-walk' },
      ...unread(ago(2 * 60 * MINUTE)),
    },
    {
      id: 'n-new-comment',
      category: 'new_comment',
      title: 'New comment',
      body: `${name(0)} commented on Coffee & Chat: “Grab the window seats!”`,
      data: { kind: 'comment', postId: 'p-coffee-chat' },
      ...unread(ago(5 * 60 * MINUTE)),
    },
    {
      id: 'n-request-accepted',
      category: 'request_accepted',
      title: 'You’re in',
      body: `${name(5)} accepted your request to join Sunday Morning Ride.`,
      data: { kind: 'request_accepted', postId: 'p-sunday-ride' },
      ...read(ago(DAY)),
    },
    {
      id: 'n-post-update',
      category: 'post_update',
      title: 'Time changed',
      body: 'Jazz on the Terrace now starts at 8pm.',
      data: { kind: 'post_updated', postId: 'p-jazz' },
      ...read(ago(2 * DAY)),
    },
    {
      id: 'n-subscription',
      category: 'subscription',
      title: 'Travel is on',
      body: 'Teleport to any city and see what’s happening before you land.',
      data: { kind: 'subscription' },
      ...read(ago(3 * DAY)),
    },
    {
      id: 'n-moderation',
      category: 'moderation',
      title: 'Report reviewed',
      body: 'Thanks for your report. We’ve looked into it and taken action.',
      data: { kind: 'report_resolved' },
      ...read(ago(6 * DAY)),
    },
  ];
}

let inbox = seed();
registerReset(() => {
  inbox = seed();
});

const signedIn = () => store.me ?? fail(401, 'UNAUTHORIZED', 'Not signed in (demo).');

export const notificationRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/me\/notifications$/,
    (_m, _r, q) => {
      signedIn();
      const onlyUnread = q.get('unread') === 'true';
      const items = inbox.filter((n) => !onlyUnread || n.readAt === null);
      return { ...page(items, q), unreadCount: inbox.filter((n) => n.readAt === null).length };
    },
  ],
  [
    // Leaving `ids` out marks everything read.
    'POST',
    /^\/api\/v1\/me\/notifications\/read$/,
    (_m, req) => {
      signedIn();
      const ids = (req.body as { ids?: unknown } | null)?.ids;
      const only = Array.isArray(ids) ? new Set(ids.map(String)) : null;
      const now = new Date().toISOString();
      inbox = inbox.map((n) => (n.readAt === null && (!only || only.has(n.id)) ? { ...n, readAt: now } : n));
      return undefined;
    },
  ],
  [
    // Register or refresh this phone's push token: 204, idempotent.
    'POST',
    /^\/api\/v1\/me\/devices$/,
    (_m, req) => {
      signedIn();
      const token = (req.body as { token?: unknown } | null)?.token;
      if (typeof token !== 'string' || token.length === 0 || token.length > 512) {
        fail(400, 'VALIDATION_FAILED', 'token is required (demo).');
      }
      return undefined;
    },
  ],
  [
    // Sign-out sends this before `POST /auth/logout`: 204.
    'POST',
    /^\/api\/v1\/me\/devices\/unregister$/,
    () => {
      signedIn();
      return undefined;
    },
  ],
];
