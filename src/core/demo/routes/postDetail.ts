import { ApiError } from '../../api/ApiError';
import {
  archived,
  fail,
  page,
  registerReset,
  rememberPerson,
  store,
  type DemoPost,
  type DemoRoute,
} from '../demoStore';

/**
 * Demo answers for the post page (API map §6): who is going, the host's
 * requests with accept and decline, cancelling and deleting a post, and the
 * comments with their replies (spec §2.18). Shaped like `AttendeesPageDto`,
 * `RsvpStateDto` and `CommentsPageDto` (spec §6).
 *
 * The people are made up from a fixed list, the same for a post every time, as
 * many as its going count. Your own RSVP puts you at the top. A private post
 * you host gets two requests to try Accept and Decline on.
 */

const FIRST = [
  'Biodun',
  'Tunde',
  'Ngozi',
  'Kola',
  'Amaka',
  'Femi',
  'Zainab',
  'Chidi',
  'Ife',
  'Musa',
  'Lola',
  'Emeka',
];
const LAST = ['Martins', 'Adebayo', 'Obi', 'Adesanya', 'Okafor', 'Bello', 'Eze', 'Lawal'];

type Person = { id: string; displayName: string; avatarUrl: string | null; verified: boolean };

function person(postId: string, i: number): Person {
  const seed = [...postId].reduce((sum, c) => sum + c.charCodeAt(0), 0) + i;
  return rememberPerson({
    id: `u-${postId}-${i}`,
    displayName: `${FIRST[seed % FIRST.length]} ${LAST[Math.floor(seed / FIRST.length) % LAST.length]}`,
    avatarUrl: `https://i.pravatar.cc/150?img=${(seed % 70) + 1}`,
    verified: i % 3 === 0,
  }) as Person;
}

/** A host's pending requests, per post, once first asked for. */
const requests = new Map<string, Person[]>();
/** People a host let in, per post, so the list shows them after Accept. */
const accepted = new Map<string, Person[]>();

/** A live post, or a past one an area keeps (Trips, Profiles) — both open on the post page. */
const find = (id: string): DemoPost =>
  store.posts.find((p) => p.id === id) ??
  archived(id) ??
  fail(404, 'NOT_FOUND', 'This post is not available.');

function requestsFor(p: DemoPost): Person[] {
  if (p.hostIndex !== 'me' || p.visibility !== 'private') return [];
  if (!requests.has(p.id)) requests.set(p.id, [person(p.id, 900), person(p.id, 901)]);
  return requests.get(p.id) ?? [];
}

function you(): Person {
  const me = store.me;
  return {
    id: 'me',
    displayName: me ? [me.firstName, me.lastName].filter(Boolean).join(' ') || 'You' : 'You',
    avatarUrl: me?.avatarUrl ?? null,
    verified: false,
  };
}

function goingPeople(p: DemoPost): Person[] {
  const mine = p.rsvpState === 'going' ? [you()] : [];
  const letIn = accepted.get(p.id) ?? [];
  const others = Math.max(0, p.goingCount - mine.length - letIn.length);
  return [...mine, ...letIn, ...Array.from({ length: others }, (_, i) => person(p.id, i))];
}

const since = new Date(Date.now() - 2 * 86_400_000).toISOString();

// ---------- comments (spec §2.18) ----------

/** `CreateCommentDto.body` is 1–1000 characters. */
const COMMENT_MAX = 1000;
/** `ReportCommentDto.details`. */
const DETAILS_MAX = 500;

type Voice = { id: string; displayName: string; avatarUrl: string | null; verified: boolean };

/** One comment as the demo keeps it; `toDto` shapes it as the API sends it. */
type DemoComment = {
  id: string;
  postId: string;
  /** The top-level comment it sits under; null on a top-level one. */
  parentId: string | null;
  author: Voice;
  body: string;
  createdAt: string;
  deleted: boolean;
  /** The demo person reported it (a second report is a 409). */
  reported: boolean;
};

const VOICES = {
  biodun: { id: 'u-biodun', displayName: 'Biodun Martins', avatarUrl: 'https://i.pravatar.cc/150?img=15', verified: false },
  ngozi: { id: 'u-ngozi', displayName: 'Ngozi Obi', avatarUrl: 'https://i.pravatar.cc/150?img=5', verified: true },
  fatima: { id: 'u-fatima', displayName: 'Fatima Bello', avatarUrl: 'https://i.pravatar.cc/150?img=24', verified: false },
  kola: { id: 'u-kola', displayName: 'Kola Adesanya', avatarUrl: 'https://i.pravatar.cc/150?img=53', verified: false },
};
// So tapping a commenter opens their profile rather than "This profile isn't available".
Object.values(VOICES).forEach(rememberPerson);

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/**
 * A few posts start with a conversation; the rest start empty. Tarkwa Bay has a
 * thread with a reply; the cultural night has a deleted question whose answer
 * stays ("Comment deleted"); the rooftop is the demo person's own post, so they
 * may delete anyone's comment there.
 */
function seedComments(postId: string): DemoComment[] {
  const said = (
    n: number,
    who: keyof typeof VOICES,
    body: string,
    h: number,
    over: Partial<DemoComment> = {},
  ): DemoComment => ({
    id: `${postId}-c${n}`,
    postId,
    parentId: null,
    author: VOICES[who],
    body,
    createdAt: hoursAgo(h),
    deleted: false,
    reported: false,
    ...over,
  });
  switch (postId) {
    case 'p-tarkwa':
      return [
        said(1, 'biodun', 'Went last season. Absolutely worth every naira. The water is stunning.', 5),
        said(2, 'ngozi', 'Should we bring swimming gear?', 3),
        said(3, 'fatima', 'Yes! Board shorts and a change of clothes highly recommended 🩱', 2, {
          parentId: `${postId}-c2`,
        }),
        said(4, 'kola', 'Only a few spots left — grab yours before it’s gone!', 1),
      ];
    case 'p-cultural':
      return [
        said(1, 'ngozi', 'Is there a dress code, or come as you are?', 6, { deleted: true }),
        said(2, 'fatima', 'Come as you are! Bring an appetite 😄', 4, { parentId: `${postId}-c1` }),
        said(3, 'kola', 'Is there parking nearby?', 3),
      ];
    case 'p-my-rooftop':
      return [said(1, 'kola', 'Is there a minimum spend at the rooftop?', 2)];
    default:
      return [];
  }
}

/** Every comment and reply, per post, oldest first. */
const comments = new Map<string, DemoComment[]>();
const commentsOf = (postId: string) => {
  if (!comments.has(postId)) comments.set(postId, seedComments(postId));
  return comments.get(postId) ?? [];
};

const liveReplies = (all: DemoComment[], id: string) => all.filter((c) => c.parentId === id && !c.deleted);

/** `CommentDto`: `mine` is the demo person's; `canDelete` theirs, or any on a post they host. */
function toDto(c: DemoComment, all: DemoComment[], host: boolean) {
  const mine = c.author.id === 'me';
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    author: c.deleted ? null : c.author,
    body: c.deleted ? null : c.body,
    deleted: c.deleted,
    replyCount: c.parentId === null ? liveReplies(all, c.id).length : 0,
    createdAt: c.createdAt,
    mine: !c.deleted && mine,
    canDelete: !c.deleted && (mine || host),
  };
}

const findComment = (all: DemoComment[], id: string) =>
  all.find((c) => c.id === id) ?? fail(404, 'NOT_FOUND', 'No such comment.');

/** The demo person as a comment's author. */
function author(): Voice {
  const me = store.me;
  return {
    id: 'me',
    displayName: me ? [me.firstName, me.lastName].filter(Boolean).join(' ') || 'You' : 'You',
    avatarUrl: me?.avatarUrl ?? null,
    verified: false,
  };
}

const commentRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/posts\/([^/]+)\/comments$/,
    (m, _req, query) => {
      const p = find(m[1] as string);
      const all = commentsOf(p.id);
      // A deleted comment stays only while it has replies to hold together.
      const top = all.filter((c) => c.parentId === null && (!c.deleted || liveReplies(all, c.id).length > 0));
      const total = all.filter((c) => !c.deleted).length;
      const host = p.hostIndex === 'me';
      return { ...page(top.map((c) => toDto(c, all, host)), query), total };
    },
  ],
  [
    'GET',
    /^\/api\/v1\/posts\/([^/]+)\/comments\/([^/]+)\/replies$/,
    (m, _req, query) => {
      const p = find(m[1] as string);
      const all = commentsOf(p.id);
      const parent = findComment(all, m[2] as string);
      const host = p.hostIndex === 'me';
      return { ...page(liveReplies(all, parent.id).map((c) => toDto(c, all, host)), query), total: 0 };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/comments$/,
    (m, req) => {
      const p = find(m[1] as string);
      const body = (req.body ?? {}) as { body?: string; parentId?: string };
      const text = (body.body ?? '').trim();
      if (!text || text.length > COMMENT_MAX) {
        throw new ApiError({
          code: 'VALIDATION_FAILED',
          message: 'A comment is 1 to 1000 characters.',
          status: 400,
          requestId: 'demo',
          fieldErrors: [{ field: 'body', message: 'must be 1 to 1000 characters' }],
        });
      }
      if (p.status === 'cancelled') return fail(409, 'POST_CANCELLED', 'This post was cancelled.');
      const all = commentsOf(p.id);
      // Replying to a reply joins the same top-level comment.
      const parent = body.parentId ? findComment(all, body.parentId) : null;
      const comment: DemoComment = {
        id: `${p.id}-c${all.length + 1}-${store.nextId()}`,
        postId: p.id,
        parentId: parent ? (parent.parentId ?? parent.id) : null,
        author: author(),
        body: text,
        createdAt: new Date().toISOString(),
        deleted: false,
        reported: false,
      };
      all.push(comment);
      return toDto(comment, all, p.hostIndex === 'me');
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/posts\/([^/]+)\/comments\/([^/]+)$/,
    (m) => {
      const p = find(m[1] as string);
      const all = commentsOf(p.id);
      const c = findComment(all, m[2] as string);
      // Idempotent: deleting it again is fine.
      if (c.deleted) return undefined;
      if (c.author.id !== 'me' && p.hostIndex !== 'me') return fail(404, 'NOT_FOUND', 'Not yours to delete.');
      c.deleted = true;
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/comments\/([^/]+)\/report$/,
    (m, req) => {
      const p = find(m[1] as string);
      const c = findComment(commentsOf(p.id), m[2] as string);
      if (c.deleted) return fail(404, 'NOT_FOUND', 'No such comment.');
      const body = (req.body ?? {}) as { reason?: string; details?: string };
      const reasons = ['harassment', 'impersonation', 'spam', 'inappropriate_content', 'other'];
      if (!body.reason || !reasons.includes(body.reason))
        return fail(400, 'VALIDATION_FAILED', 'Choose a reason.');
      if (body.reason === 'other' && !body.details?.trim())
        return fail(400, 'VALIDATION_FAILED', 'Say what happened.');
      if ((body.details ?? '').length > DETAILS_MAX) return fail(400, 'VALIDATION_FAILED', 'Details are too long.');
      if (c.author.id === 'me') return fail(400, 'BAD_REQUEST', 'You cannot report your own comment.');
      if (c.reported) return fail(409, 'CONFLICT', 'You already reported this.');
      c.reported = true;
      return { id: `report-${c.id}` };
    },
  ],
];

// Comments, requests and acceptances start again with the rest of the world.
registerReset(() => {
  comments.clear();
  requests.clear();
  accepted.clear();
});

export const postDetailRoutes: DemoRoute[] = [
  ...commentRoutes,
  [
    'GET',
    /^\/api\/v1\/posts\/([^/]+)\/attendees$/,
    (m, _req, q) => {
      const p = find(m[1] as string);
      const state = q.get('state') ?? 'going';
      const host = p.hostIndex === 'me';
      if (state !== 'going' && !host) return fail(403, 'FORBIDDEN', 'Only the host can see this list.');
      const people = state === 'requested' ? requestsFor(p) : state === 'waitlisted' ? [] : goingPeople(p);
      return {
        ...page(
          people.map((user, i) => ({
            user,
            state,
            since,
            position: state === 'waitlisted' ? i + 1 : null,
          })),
          q,
        ),
        counts: {
          going: p.goingCount,
          requested: host ? requestsFor(p).length : null,
          waitlisted: host ? 0 : null,
        },
      };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/attendees\/([^/]+)\/(accept|decline)$/,
    (m) => {
      const p = find(m[1] as string);
      if (p.hostIndex !== 'me') return fail(404, 'NOT_FOUND', 'Not your post.');
      const list = requestsFor(p);
      const who = list.find((r) => r.id === m[2]) ?? fail(404, 'NOT_FOUND', 'No such request.');
      requests.set(
        p.id,
        list.filter((r) => r.id !== who.id),
      );
      if (m[3] === 'decline') {
        return { state: 'declined', goingCount: p.goingCount, capacity: p.capacity, waitlistPosition: null };
      }
      if (p.capacity !== null && p.goingCount >= p.capacity) {
        return fail(409, 'POST_FULL', 'No spot is left.');
      }
      p.goingCount += 1;
      accepted.set(p.id, [who, ...(accepted.get(p.id) ?? [])]);
      return { state: 'going', goingCount: p.goingCount, capacity: p.capacity, waitlistPosition: null };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/cancel$/,
    (m) => {
      const p = find(m[1] as string);
      if (p.hostIndex !== 'me') return fail(404, 'NOT_FOUND', 'Not your post.');
      if (p.status !== 'published') return fail(409, 'CONFLICT', 'Only a live post can be cancelled.');
      // The demo's post type knows only draft and published; cancelled is the API's third state.
      (p as { status: string }).status = 'cancelled';
      return { id: p.id, status: 'cancelled' };
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/posts\/([^/]+)$/,
    (m) => {
      const p = find(m[1] as string);
      if (p.hostIndex !== 'me') return fail(404, 'NOT_FOUND', 'Not your post.');
      if (p.goingCount > 0) {
        throw new ApiError({
          code: 'POST_HAS_ATTENDEES',
          message: 'People have joined; cancel it instead.',
          status: 409,
          requestId: 'demo',
        });
      }
      store.posts.splice(store.posts.indexOf(p), 1);
      return undefined;
    },
  ],
];
