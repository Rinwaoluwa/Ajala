import { ApiError } from '../../api/ApiError';
import { archived, fail, page, rememberPerson, store, type DemoPost, type DemoRoute } from '../demoStore';

/**
 * Demo answers for the post page (API map §6): who is going, the host's
 * requests with accept and decline, cancelling and deleting a post. Shaped like
 * `AttendeesPageDto` and `RsvpStateDto` (spec §6).
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

// ---------- comments (PROPOSED endpoint — not in the API yet, API map §12) ----------

type DemoComment = {
  id: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  replyTo: { id: string; displayName: string } | null;
};

const VOICES = {
  biodun: { id: 'u-biodun', displayName: 'Biodun Martins', avatarUrl: 'https://i.pravatar.cc/150?img=15' },
  ngozi: { id: 'u-ngozi', displayName: 'Ngozi Obi', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
  fatima: { id: 'u-fatima', displayName: 'Fatima Bello', avatarUrl: 'https://i.pravatar.cc/150?img=24' },
  kola: { id: 'u-kola', displayName: 'Kola Adesanya', avatarUrl: 'https://i.pravatar.cc/150?img=53' },
};
Object.values(VOICES).forEach(rememberPerson);

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** A few posts start with a conversation; the rest start empty. */
function seedComments(postId: string): DemoComment[] {
  const said = (n: number, who: keyof typeof VOICES, text: string, h: number): DemoComment => ({
    id: `${postId}-c${n}`,
    user: VOICES[who],
    text,
    createdAt: hoursAgo(h),
    replyTo: null,
  });
  switch (postId) {
    case 'p-tarkwa':
      return [
        said(1, 'biodun', 'Went last season. Absolutely worth every naira. The water is stunning.', 5),
        said(2, 'ngozi', 'Should we bring swimming gear?', 3),
        said(3, 'fatima', 'Yes! Board shorts and a change of clothes highly recommended 🩱', 2),
        said(4, 'kola', 'Only a few spots left — grab yours before it’s gone!', 1),
      ];
    case 'p-cultural':
      return [
        said(1, 'ngozi', 'Is there a dress code, or come as you are?', 6),
        said(2, 'fatima', 'Come as you are! Bring an appetite 😄', 4),
      ];
    case 'p-my-rooftop':
      return [said(1, 'kola', 'Is there a minimum spend at the rooftop?', 2)];
    default:
      return [];
  }
}

const comments = new Map<string, DemoComment[]>();
const commentsOf = (postId: string) => {
  if (!comments.has(postId)) comments.set(postId, seedComments(postId));
  return comments.get(postId) ?? [];
};

export const postDetailRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/posts\/([^/]+)\/comments$/,
    (m, _req, query) => {
      const all = commentsOf(m[1] as string);
      return { ...page(all, query), total: all.length };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/posts\/([^/]+)\/comments$/,
    (m, req) => {
      const body = req.body as { text?: string; replyToId?: string };
      const text = (body.text ?? '').trim();
      if (!text) return fail(400, 'VALIDATION_FAILED', 'Write something first.');
      const all = commentsOf(m[1] as string);
      const parent = body.replyToId ? all.find((c) => c.id === body.replyToId) : undefined;
      const me = store.me;
      const comment: DemoComment = {
        id: `${m[1]}-c${all.length + 1}-${Date.now()}`,
        user: {
          id: 'me',
          displayName: me ? [me.firstName, me.lastName].filter(Boolean).join(' ') || 'You' : 'You',
          avatarUrl: me?.avatarUrl ?? null,
        },
        text,
        createdAt: new Date().toISOString(),
        replyTo: parent ? { id: parent.id, displayName: parent.user.displayName } : null,
      };
      all.push(comment);
      return comment;
    },
  ],
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
