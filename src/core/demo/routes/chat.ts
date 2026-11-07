import { DEMO_HOSTS } from '../demoData';
import {
  card,
  fail,
  findPost,
  page,
  registerReset,
  rememberPerson,
  store,
  traveller,
  type DemoPerson,
  type DemoRoute,
} from '../demoStore';

/**
 * Demo answers for chat (spec §2.18, §3.9; shapes in §6): the conversations in
 * the Figma frames, opening a chat with a person or a post's group, sending
 * (multipart, idempotent on `clientMsgId`), read marks, typing, members and
 * reports. What you do is kept in memory while the app runs.
 *
 * There is no socket in the demo: nobody answers, and nothing arrives live.
 *
 * Message ids are 19-digit strings past 2^53, as the API's 64-bit ids are, so
 * the app's string handling of them is exercised: read as JS numbers, two of
 * them would round to the same value.
 *
 * To try the refusals: James K. (`h-james`) only takes messages from people he
 * shares a post with (403); a post you don't host can't get a group chat
 * (403); the eleventh new direct chat in a run hits `CHAT_START_LIMIT` (429).
 */

type Person = DemoPerson & { verified: boolean };
type Image = { thumbUrl: string; url: string };
type Message = {
  id: string;
  clientMsgId: string;
  senderId: string;
  body: string | null;
  images: Image[];
  taggedPostId: string | null;
  removed: boolean;
  createdAt: string;
};
type Member = { id: string; role: 'owner' | 'member'; online: boolean; lastReadMessageId: string | null };
type Conversation = {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  postId: string | null;
  members: Member[];
  /** Your unread count as the designs show it, until you first read the conversation. */
  seededUnread: number | null;
  messages: Message[];
  createdAt: string;
};

const ME = 'me';
/** New direct chats with people you share no post with, per day (10 for a new account, 40 after). */
const START_LIMIT = 10;
/** Who only takes messages from people they share a post with (`dmPermission: shared_only`). */
const SHARED_ONLY = new Set(['h-james']);

const P = {
  chioma: { id: 'u-chioma', displayName: 'Chioma Obi', avatarUrl: 'https://i.pravatar.cc/150?img=48', verified: true },
  kofi: { id: 'u-kofi', displayName: 'Kofi Mensah', avatarUrl: 'https://i.pravatar.cc/150?img=13', verified: false },
  maya: { id: 'u-maya', displayName: 'Maya Chen', avatarUrl: 'https://i.pravatar.cc/150?img=16', verified: true },
  sam: { id: 'u-sam', displayName: 'Sam Daniels', avatarUrl: 'https://i.pravatar.cc/150?img=60', verified: false },
  tunde: { id: 'u-tunde', displayName: 'Tunde Adebayo', avatarUrl: 'https://i.pravatar.cc/150?img=68', verified: false },
  amara: { id: 'u-amara', displayName: 'Amara Eze', avatarUrl: 'https://i.pravatar.cc/150?img=32', verified: false },
};
Object.values(P).forEach(rememberPerson);

/**
 * When a seeded message was sent. Earlier days sit at that clock time; today's
 * read as if it were 10:45 now (10:42 is three minutes ago), so they are always
 * in the past and anything you send lands after them.
 */
const clock = (days: number, hour: number, minute: number) => {
  if (days === 0) return new Date(Date.now() - (10 * 60 + 45 - (hour * 60 + minute)) * 60_000).toISOString();
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** A 64-bit-sized id: fixed width, so ordering by string is ordering by number. */
let nextMessage = 1;
const messageId = () => `90071992547${String(nextMessage++).padStart(8, '0')}`;
let nextConversation = 1;

function person(id: string): Person | null {
  if (id === ME) {
    const m = store.me;
    return {
      id: ME,
      displayName: m ? `${m.firstName ?? 'You'} ${m.lastName?.[0] ?? ''}.`.replace(/ \.$/, '') : 'You',
      avatarUrl: m?.avatarUrl ?? null,
      verified: false,
    };
  }
  const known = traveller(id) ?? DEMO_HOSTS.find((h) => h.id === id);
  return known ? { verified: false, ...known } : null;
}

const hostCard = (id: string) => {
  const p = person(id) ?? { id, displayName: 'Ajala traveller', avatarUrl: null, verified: false };
  return { id: p.id, displayName: p.displayName, avatarUrl: p.avatarUrl, verified: !!p.verified };
};

function seed(): Conversation[] {
  nextMessage = 1;
  nextConversation = 1;
  const msg = (senderId: string, body: string | null, createdAt: string, extra: Partial<Message> = {}): Message => ({
    id: messageId(),
    clientMsgId: `seed-${nextMessage}`,
    senderId,
    body,
    images: [],
    taggedPostId: null,
    removed: false,
    createdAt,
    ...extra,
  });
  const member = (id: string, role: Member['role'], online: boolean, lastRead: string | null = null): Member => ({
    id,
    role,
    online,
    lastReadMessageId: lastRead,
  });
  const group = (
    id: string,
    title: string,
    postId: string | null,
    people: { id: string; online: boolean }[],
    messages: Message[],
    unread: number,
  ): Conversation => {
    const newest = messages[messages.length - 1]?.id ?? null;
    return {
      id,
      kind: 'group',
      title,
      postId,
      // The first person hosts; they and most others have read everything.
      members: [
        member(people[0]?.id ?? ME, 'owner', people[0]?.online ?? false, newest),
        ...people.slice(1).map((p, i) => member(p.id, 'member', p.online, i % 2 === 0 ? newest : null)),
        member(ME, 'member', true, null),
      ],
      seededUnread: unread,
      messages,
      createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
    };
  };
  const direct = (
    id: string,
    other: string,
    online: boolean,
    postId: string | null,
    messages: Message[],
    unread: number,
    theyRead: boolean,
  ): Conversation => {
    // Read up to the newest, or (not yet) only up to the message before your last one.
    const myLast = messages.map((m) => m.senderId).lastIndexOf(ME);
    const theirMark = theyRead
      ? (messages[messages.length - 1]?.id ?? null)
      : (messages[myLast - 1]?.id ?? null);
    return {
      id,
      kind: 'direct',
      title: null,
      postId,
      members: [member(other, 'member', online, theirMark), member(ME, 'member', true, null)],
      seededUnread: unread,
      messages,
      createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
    };
  };

  return [
    group(
      'c-lagos-crew',
      'Lagos Weekend Crew',
      'p-tarkwa',
      [
        { id: P.chioma.id, online: true },
        { id: P.kofi.id, online: true },
        { id: P.amara.id, online: false },
        { id: P.sam.id, online: true },
      ],
      [
        msg(P.chioma.id, 'Hey everyone! Who’s ready for Saturday?', clock(0, 9, 41)),
        msg(ME, 'Me! Should we meet at the main entrance?', clock(0, 9, 42)),
        msg(P.kofi.id, 'Yes, let’s meet there at 8:45 AM.', clock(0, 9, 43)),
        msg(P.amara.id, null, clock(0, 9, 43), { removed: true }),
        msg(ME, 'Perfect. I’ll bring water and my camera.', clock(0, 9, 44)),
        msg(P.kofi.id, 'This is the boat I mentioned.', clock(0, 10, 5), {
          images: [
            { thumbUrl: 'https://picsum.photos/seed/tarkwa-boat/320/320', url: 'https://picsum.photos/seed/tarkwa-boat/1600/1600' },
            { thumbUrl: 'https://picsum.photos/seed/tarkwa-jetty/320/320', url: 'https://picsum.photos/seed/tarkwa-jetty/1600/1600' },
          ],
        }),
        msg(P.chioma.id, 'See you at the meeting point!', clock(0, 10, 42)),
      ],
      5,
    ),
    direct(
      'c-maya',
      P.maya.id,
      true,
      'p-lekki-market',
      [
        msg(P.maya.id, 'Hey! Are you joining the Lekki market run tomorrow?', clock(0, 9, 41), {
          taggedPostId: 'p-lekki-market',
        }),
        msg(ME, 'Absolutely! Shall we meet at the entrance?', clock(0, 9, 42)),
        msg(P.maya.id, 'Yes! Let’s get there at 9:15 AM. Can’t wait to explore.', clock(0, 9, 43)),
        msg(ME, 'Sounds like a plan. See you there!', clock(0, 9, 44)),
        msg(P.maya.id, 'Are we still on for tomorrow?', clock(0, 10, 30)),
      ],
      2,
      true,
    ),
    group(
      'c-accra-food',
      'Accra Food Trail',
      null,
      [
        { id: P.kofi.id, online: true },
        { id: P.amara.id, online: true },
        { id: P.tunde.id, online: false },
      ],
      [msg(P.kofi.id, 'Kofi shared a new spot to try.', clock(0, 9, 18), { taggedPostId: 'p-gone-supper-club' })],
      3,
    ),
    direct(
      'c-chioma',
      P.chioma.id,
      false,
      null,
      [
        msg(P.chioma.id, 'Loved today! Do you have the group photos?', clock(1, 20, 5)),
        msg(ME, 'I’ll send the photos tonight.', clock(1, 20, 12)),
      ],
      0,
      false,
    ),
    group(
      'c-cape-town',
      'Cape Town Explorers',
      null,
      [
        { id: P.sam.id, online: true },
        { id: P.tunde.id, online: false },
      ],
      [msg(P.sam.id, 'The sunset hike is confirmed.', clock(3, 17, 30))],
      0,
    ),
    group(
      'c-art-lagos',
      'Art Lagos Meetup',
      null,
      [
        { id: P.tunde.id, online: false },
        { id: P.chioma.id, online: false },
      ],
      [
        msg(P.tunde.id, 'Thanks for coming, everyone!', clock(4, 21, 0)),
        msg(ME, 'Thanks for a lovely evening!', clock(4, 21, 10)),
      ],
      0,
    ),
  ];
}

let conversations: Conversation[] | null = null;
let startsToday = 0;
const reported = new Set<string>();
const all = () => (conversations ??= seed());
const mine = () => all().filter((c) => c.members.some((m) => m.id === ME));

registerReset(() => resetChatDemo());

const meMember = (c: Conversation) => c.members.find((m) => m.id === ME);
const later = (a: string, b: string | null) => b === null || a.length > b.length || (a.length === b.length && a > b);

function unreadCount(c: Conversation): number {
  if (c.seededUnread !== null) return c.seededUnread;
  const read = meMember(c)?.lastReadMessageId ?? null;
  return Math.min(99, c.messages.filter((m) => m.senderId !== ME && later(m.id, read)).length);
}

const newest = (c: Conversation) => c.messages[c.messages.length - 1] ?? null;
const activityAt = (c: Conversation) => newest(c)?.createdAt ?? c.createdAt;

/** `ConversationDto` (spec §6). */
function conversationDto(c: Conversation) {
  const last = newest(c);
  const other = c.kind === 'direct' ? c.members.find((m) => m.id !== ME) : undefined;
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    postId: c.postId,
    other: other ? hostCard(other.id) : null,
    memberCount: c.members.length,
    lastMessage: last
      ? {
          id: last.id,
          senderId: last.senderId,
          preview: last.removed || !last.body ? null : last.body.slice(0, 120),
          imageCount: last.removed ? 0 : last.images.length,
          createdAt: last.createdAt,
        }
      : null,
    unreadCount: unreadCount(c),
    activityAt: activityAt(c),
  };
}

/** `ConversationDetailDto`: members host first, with who is online and how far each has read. */
function detailDto(c: Conversation) {
  const members = [...c.members].sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1));
  return {
    ...conversationDto(c),
    onlineCount: c.members.filter((m) => m.online).length,
    members: members.map((m) => ({
      user: hostCard(m.id),
      role: m.role,
      online: m.online,
      lastReadMessageId: m.lastReadMessageId,
    })),
  };
}

/** `MessageDto`. A removed message keeps no words, pictures or post. */
function messageDto(c: Conversation, m: Message) {
  const post = m.taggedPostId ? findPost(m.taggedPostId) : undefined;
  const visible = post && post.status !== 'draft';
  return {
    id: m.id,
    conversationId: c.id,
    sender: hostCard(m.senderId),
    body: m.removed ? null : m.body,
    images: m.removed ? [] : m.images,
    taggedPost: !m.removed && visible ? card(post) : null,
    taggedPostUnavailable: !m.removed && !!m.taggedPostId && !visible,
    clientMsgId: m.clientMsgId,
    removed: m.removed,
    mine: m.senderId === ME,
    createdAt: m.createdAt,
  };
}

const find = (id: string) =>
  mine().find((c) => c.id === id) ?? fail(404, 'NOT_FOUND', 'No such conversation.');

/** The fields and files of a multipart body, as React Native's FormData holds them; plain objects too. */
function form(body: unknown) {
  const parts = (body as { _parts?: [string, unknown][] } | null)?._parts;
  const entries: [string, unknown][] = parts ?? Object.entries((body as Record<string, unknown> | null) ?? {});
  const fields: Record<string, string> = {};
  const files: string[] = [];
  for (const [key, value] of entries) {
    if (key === 'images' && Array.isArray(value)) value.forEach((v) => files.push(String((v as { uri?: string }).uri ?? v)));
    else if (value && typeof value === 'object' && 'uri' in value) files.push(String((value as { uri: string }).uri));
    else fields[key] = String(value);
  }
  return { fields, files };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function startDirect(userId: string) {
  if (userId === ME) return fail(409, 'CONFLICT', 'You can’t start a chat with yourself.');
  const other = person(userId) ?? fail(404, 'NOT_FOUND', 'No such person.');
  const existing = mine().find((c) => c.kind === 'direct' && c.members.some((m) => m.id === userId));
  if (existing) return detailDto(existing);
  if (SHARED_ONLY.has(userId)) {
    return fail(403, 'FORBIDDEN', 'They only take messages from people they share a post with.');
  }
  if (startsToday >= START_LIMIT) {
    return fail(429, 'CHAT_START_LIMIT', 'You’ve started a lot of new chats today.');
  }
  startsToday += 1;
  const c: Conversation = {
    id: `c-new-${nextConversation++}`,
    kind: 'direct',
    title: null,
    postId: null,
    members: [
      { id: other.id, role: 'member', online: false, lastReadMessageId: null },
      { id: ME, role: 'member', online: true, lastReadMessageId: null },
    ],
    seededUnread: null,
    messages: [],
    createdAt: new Date().toISOString(),
  };
  all().unshift(c);
  return detailDto(c);
}

function startGroup(postId: string) {
  const post = findPost(postId) ?? fail(404, 'NOT_FOUND', 'No such post.');
  const existing = mine().find((c) => c.kind === 'group' && c.postId === postId);
  if (existing) return detailDto(existing);
  if (post.hostIndex !== 'me') return fail(403, 'FORBIDDEN', 'Only the host can start the group chat.');
  if (post.status !== 'published') return fail(409, 'CONFLICT', 'This post isn’t live.');
  if (post.goingCount + 1 > 50) return fail(409, 'CONFLICT', 'More than 50 people are going.');
  // The demo's "people going": a few travellers, up to the post's going count.
  const going = [P.amara, P.kofi, P.chioma, P.sam].slice(0, Math.min(4, post.goingCount));
  const c: Conversation = {
    id: `c-new-${nextConversation++}`,
    kind: 'group',
    title: post.title,
    postId,
    members: [
      { id: ME, role: 'owner', online: true, lastReadMessageId: null },
      ...going.map((p) => ({ id: p.id, role: 'member' as const, online: false, lastReadMessageId: null })),
    ],
    seededUnread: null,
    messages: [],
    createdAt: new Date().toISOString(),
  };
  all().unshift(c);
  return detailDto(c);
}

export const chatRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/conversations$/,
    (_m, _req, query) => {
      const tab = query.get('tab') ?? 'all';
      const search = (query.get('search') ?? '').trim().toLowerCase();
      if (search.length > 60) return fail(400, 'VALIDATION_FAILED', 'search must be 60 characters or fewer.');
      const items = mine()
        .filter((c) => (tab === 'unread' ? unreadCount(c) > 0 : tab === 'groups' ? c.kind === 'group' : true))
        .filter((c) => {
          if (!search) return true;
          const dto = conversationDto(c);
          return [dto.title, dto.other?.displayName, dto.lastMessage?.preview].some((s) =>
            (s ?? '').toLowerCase().includes(search),
          );
        })
        .sort((a, b) => activityAt(b).localeCompare(activityAt(a)))
        .map(conversationDto);
      return page(items, query);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations$/,
    (_m, req) => {
      const body = (req.body ?? {}) as { userId?: string; postId?: string };
      if (!!body.userId === !!body.postId) {
        return fail(400, 'BAD_REQUEST', 'Send exactly one of userId and postId.');
      }
      return body.userId ? startDirect(body.userId) : startGroup(body.postId as string);
    },
  ],
  ['GET', /^\/api\/v1\/conversations\/([^/]+)$/, (m) => detailDto(find(m[1] as string))],
  [
    'GET',
    /^\/api\/v1\/conversations\/([^/]+)\/messages$/,
    (m, _req, query) => {
      const c = find(m[1] as string);
      const limit = Math.min(Number(query.get('limit') ?? 30) || 30, 50);
      const before = query.get('before');
      const older = [...c.messages].reverse().filter((x) => !before || later(before, x.id));
      const items = older.slice(0, limit);
      return {
        items: items.map((x) => messageDto(c, x)),
        // The next `before` is the oldest id on this page.
        nextCursor: older.length > limit ? (items[items.length - 1]?.id ?? null) : null,
      };
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations\/([^/]+)\/messages$/,
    (m, req) => {
      const c = find(m[1] as string);
      const { fields, files } = form(req.body);
      const clientMsgId = fields.clientMsgId ?? '';
      if (!UUID.test(clientMsgId)) return fail(400, 'VALIDATION_FAILED', 'clientMsgId must be a uuid.');
      // A retry: the first message comes back, nothing is posted twice.
      const sent = c.messages.find((x) => x.senderId === ME && x.clientMsgId === clientMsgId);
      if (sent) return messageDto(c, sent);
      const body = (fields.body ?? '').trim();
      if (!body && files.length === 0) return fail(400, 'BAD_REQUEST', 'Nothing to send.');
      if (body.length > 2000) return fail(400, 'VALIDATION_FAILED', 'body must be 2000 characters or fewer.');
      if (files.length > 4) return fail(400, 'BAD_REQUEST', 'Up to 4 pictures.');
      const message: Message = {
        id: messageId(),
        clientMsgId,
        senderId: ME,
        body: body || null,
        images: files.map((uri) => ({ thumbUrl: uri, url: uri })),
        taggedPostId: fields.taggedPostId || null,
        removed: false,
        createdAt: new Date().toISOString(),
      };
      c.messages.push(message);
      return messageDto(c, message);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations\/([^/]+)\/read$/,
    (m, req) => {
      const c = find(m[1] as string);
      const id = String((req.body as { messageId?: unknown } | null)?.messageId ?? '');
      if (!/^\d+$/.test(id)) return fail(400, 'VALIDATION_FAILED', 'messageId is required.');
      const me = meMember(c);
      // Never moves back.
      if (me && later(id, me.lastReadMessageId)) me.lastReadMessageId = id;
      c.seededUnread = null;
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations\/([^/]+)\/typing$/,
    (m) => {
      find(m[1] as string);
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations\/([^/]+)\/members$/,
    (m, req) => {
      const c = find(m[1] as string);
      const userId = String((req.body as { userId?: unknown } | null)?.userId ?? '');
      if (c.kind !== 'group' || meMember(c)?.role !== 'owner') {
        return fail(403, 'FORBIDDEN', 'Only the host can add people.');
      }
      if (!person(userId)) return fail(404, 'NOT_FOUND', 'No such person.');
      if (c.members.some((x) => x.id === userId)) return fail(409, 'CONFLICT', 'Already in the chat.');
      if (c.members.length >= 50) return fail(409, 'CONFLICT', 'The chat is full.');
      c.members.push({ id: userId, role: 'member', online: false, lastReadMessageId: null });
      return undefined;
    },
  ],
  [
    'DELETE',
    /^\/api\/v1\/conversations\/([^/]+)\/members\/([^/]+)$/,
    (m) => {
      const c = find(m[1] as string);
      const userId = decodeURIComponent(m[2] as string);
      const role = meMember(c)?.role;
      if (userId === ME) {
        if (role === 'owner') return fail(409, 'CONFLICT', 'The host can’t leave.');
      } else if (role !== 'owner') {
        return fail(403, 'FORBIDDEN', 'Only the host can remove people.');
      }
      if (!c.members.some((x) => x.id === userId)) return fail(404, 'NOT_FOUND', 'Not in this chat.');
      c.members = c.members.filter((x) => x.id !== userId);
      return undefined;
    },
  ],
  [
    'POST',
    /^\/api\/v1\/conversations\/([^/]+)\/messages\/([^/]+)\/report$/,
    (m, req) => {
      const c = find(m[1] as string);
      const id = m[2] as string;
      const message = c.messages.find((x) => x.id === id) ?? fail(404, 'NOT_FOUND', 'No such message.');
      const { reason, details } = (req.body ?? {}) as { reason?: string; details?: string };
      const reasons = ['harassment', 'impersonation', 'spam', 'inappropriate_content', 'other'];
      if (!reason || !reasons.includes(reason)) return fail(400, 'VALIDATION_FAILED', 'Pick a reason.');
      if (reason === 'other' && !details?.trim()) return fail(400, 'VALIDATION_FAILED', 'Say what happened.');
      if (message.senderId === ME) return fail(409, 'CONFLICT', 'You can’t report your own message.');
      if (reported.has(id)) return fail(409, 'CONFLICT', 'Already reported.');
      reported.add(id);
      return { id: `r-${id}` };
    },
  ],
];

/** Starts the conversations again (tests, and with the rest of the demo world). */
export function resetChatDemo() {
  conversations = null;
  startsToday = 0;
  reported.clear();
}
