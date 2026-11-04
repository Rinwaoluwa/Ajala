import { fail, page, store, type DemoRoute } from '../demoStore';

/**
 * Demo answers for Messages — the PROPOSED chat endpoints (chat is not in the
 * API yet; see src/features/chat/README.md). Seeded with the conversations in
 * the Figma frames; what you send is kept in memory while the app runs.
 */

type Person = { id: string; displayName: string; avatarUrl: string | null };
type Message = { id: string; sender: Person; text: string; sentAt: string };
type Thread = {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  avatarUrl: string | null;
  memberCount: number | null;
  onlineCount: number | null;
  other: (Person & { online: boolean }) | null;
  unreadCount: number;
  postId: string | null;
  messages: Message[];
};

const P = {
  chioma: { id: 'u-chioma', displayName: 'Chioma Obi', avatarUrl: 'https://i.pravatar.cc/150?img=48' },
  kofi: { id: 'u-kofi', displayName: 'Kofi Mensah', avatarUrl: 'https://i.pravatar.cc/150?img=13' },
  maya: { id: 'u-maya', displayName: 'Maya Chen', avatarUrl: 'https://i.pravatar.cc/150?img=16' },
  sam: { id: 'u-sam', displayName: 'Sam Daniels', avatarUrl: 'https://i.pravatar.cc/150?img=60' },
  tunde: { id: 'u-tunde', displayName: 'Tunde Adebayo', avatarUrl: 'https://i.pravatar.cc/150?img=68' },
};

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

const me = (): Person => {
  const m = store.me;
  return {
    id: 'me',
    displayName: m ? [m.firstName, m.lastName].filter(Boolean).join(' ') || 'You' : 'You',
    avatarUrl: m?.avatarUrl ?? null,
  };
};

function seed(): Thread[] {
  let n = 0;
  const msg = (sender: Person, text: string, sentAt: string): Message => ({
    id: `m-${++n}`,
    sender,
    text,
    sentAt,
  });
  const ME = { id: 'me', displayName: 'You', avatarUrl: null };
  return [
    {
      id: 'c-lagos-crew',
      kind: 'group',
      title: 'Lagos Weekend Crew',
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
      memberCount: 8,
      onlineCount: 3,
      other: null,
      unreadCount: 5,
      postId: 'p-tarkwa',
      messages: [
        msg(P.chioma, 'Hey everyone! Who’s ready for Saturday?', clock(0, 9, 41)),
        msg(ME, 'Me! Should we meet at the main entrance?', clock(0, 9, 42)),
        msg(P.kofi, 'Yes, let’s meet there at 8:45 AM.', clock(0, 9, 43)),
        msg(ME, 'Perfect. I’ll bring water and my camera.', clock(0, 9, 44)),
        msg(P.chioma, 'See you at the meeting point!', clock(0, 10, 42)),
      ],
    },
    {
      id: 'c-maya',
      kind: 'direct',
      title: 'Maya Chen',
      avatarUrl: P.maya.avatarUrl,
      memberCount: null,
      onlineCount: null,
      other: { ...P.maya, online: true },
      unreadCount: 2,
      postId: 'p-lekki-market',
      messages: [
        msg(P.maya, 'Hey! Are you joining the Lekki market run tomorrow?', clock(0, 9, 41)),
        msg(ME, 'Absolutely! Shall we meet at the entrance?', clock(0, 9, 42)),
        msg(P.maya, 'Yes! Let’s get there at 9:15 AM. Can’t wait to explore.', clock(0, 9, 43)),
        msg(ME, 'Sounds like a plan. See you there!', clock(0, 9, 44)),
        msg(P.maya, 'Are we still on for tomorrow?', clock(0, 10, 30)),
      ],
    },
    {
      id: 'c-accra-food',
      kind: 'group',
      title: 'Accra Food Trail',
      avatarUrl: 'https://picsum.photos/seed/accra-food/200/200',
      memberCount: 6,
      onlineCount: 2,
      other: null,
      unreadCount: 3,
      postId: null,
      messages: [msg(P.kofi, 'Kofi shared a new spot to try.', clock(0, 9, 18))],
    },
    {
      id: 'c-chioma',
      kind: 'direct',
      title: 'Chioma Obi',
      avatarUrl: P.chioma.avatarUrl,
      memberCount: null,
      onlineCount: null,
      other: { ...P.chioma, online: false },
      unreadCount: 0,
      postId: null,
      messages: [
        msg(P.chioma, 'Loved today! Do you have the group photos?', clock(1, 20, 5)),
        msg(ME, 'I’ll send the photos tonight.', clock(1, 20, 12)),
      ],
    },
    {
      id: 'c-cape-town',
      kind: 'group',
      title: 'Cape Town Explorers',
      avatarUrl: 'https://picsum.photos/seed/cape-town/200/200',
      memberCount: 12,
      onlineCount: 4,
      other: null,
      unreadCount: 0,
      postId: null,
      messages: [msg(P.sam, 'The sunset hike is confirmed.', clock(3, 17, 30))],
    },
    {
      id: 'c-art-lagos',
      kind: 'group',
      title: 'Art Lagos Meetup',
      avatarUrl: 'https://picsum.photos/seed/art-lagos/200/200',
      memberCount: 9,
      onlineCount: 1,
      other: null,
      unreadCount: 0,
      postId: null,
      messages: [
        msg(P.tunde, 'Thanks for coming, everyone!', clock(4, 21, 0)),
        msg(ME, 'Thanks for a lovely evening!', clock(4, 21, 10)),
      ],
    },
  ];
}

let threads: Thread[] | null = null;
const all = () => (threads ??= seed());

const messageDto = (m: Message) => ({
  id: m.id,
  sender: m.sender.id === 'me' ? me() : m.sender,
  fromMe: m.sender.id === 'me',
  text: m.text,
  sentAt: m.sentAt,
  status: 'sent' as const,
});

function threadDto(t: Thread) {
  const last = t.messages[t.messages.length - 1] ?? null;
  const post = t.postId ? store.posts.find((p) => p.id === t.postId) : undefined;
  return {
    id: t.id,
    kind: t.kind,
    title: t.title,
    avatarUrl: t.avatarUrl,
    memberCount: t.memberCount,
    onlineCount: t.onlineCount,
    other: t.other,
    lastMessage: last
      ? {
          text: last.text,
          senderName: last.sender.displayName,
          fromMe: last.sender.id === 'me',
          sentAt: last.sentAt,
        }
      : null,
    unreadCount: t.unreadCount,
    post: post ? { id: post.id, title: post.title, startAt: post.startAt, placeName: post.placeName } : null,
  };
}

const latest = (t: Thread) => t.messages[t.messages.length - 1]?.sentAt ?? '';

const find = (id: string) =>
  all().find((t) => t.id === id) ?? fail(404, 'NOT_FOUND', 'No such conversation.');

export const chatRoutes: DemoRoute[] = [
  [
    'GET',
    /^\/api\/v1\/chats$/,
    (_m, _req, query) => {
      const filter = query.get('filter') ?? 'all';
      const q = (query.get('q') ?? '').trim().toLowerCase();
      const items = all()
        .filter((t) =>
          filter === 'unread' ? t.unreadCount > 0 : filter === 'groups' ? t.kind === 'group' : true,
        )
        .filter(
          (t) =>
            !q ||
            t.title.toLowerCase().includes(q) ||
            (t.messages[t.messages.length - 1]?.text.toLowerCase().includes(q) ?? false),
        )
        .sort((a, b) => latest(b).localeCompare(latest(a)))
        .map(threadDto);
      return page(items, query);
    },
  ],
  ['GET', /^\/api\/v1\/chats\/([^/]+)$/, (m) => threadDto(find(m[1] as string))],
  [
    'GET',
    /^\/api\/v1\/chats\/([^/]+)\/messages$/,
    (m, _req, query) => page([...find(m[1] as string).messages].reverse().map(messageDto), query),
  ],
  [
    'POST',
    /^\/api\/v1\/chats\/([^/]+)\/messages$/,
    (m, req) => {
      const thread = find(m[1] as string);
      const text = String((req.body as { text?: string } | null)?.text ?? '').trim();
      if (!text) return fail(400, 'VALIDATION_FAILED', 'Write something first.');
      const message: Message = {
        id: `m-${Date.now()}`,
        sender: { id: 'me', displayName: 'You', avatarUrl: null },
        text,
        sentAt: new Date().toISOString(),
      };
      thread.messages.push(message);
      return messageDto(message);
    },
  ],
  [
    'POST',
    /^\/api\/v1\/chats\/([^/]+)\/read$/,
    (m) => {
      find(m[1] as string).unreadCount = 0;
      return undefined;
    },
  ],
];

/** Starts the conversations again (tests). */
export function resetChatDemo() {
  threads = null;
}
