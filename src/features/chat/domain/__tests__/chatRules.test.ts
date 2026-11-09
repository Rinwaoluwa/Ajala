import { describe, expect, it } from '@jest/globals';

import type { ChatMember, ChatMessage, ChatThread, ChatThreadDetail, MessageDraft } from '../entities/Chat';
import { ChatError } from '../entities/ChatError';
import type { ChatRepository } from '../repositories/ChatRepository';
import {
  compareMessageIds,
  conversationItems,
  draftProblem,
  isLaterId,
  messageStatus,
  isMine,
  myIdFrom,
  presence,
  previewLine,
  threadAvatar,
  threadName,
  upsertNewest,
  withReadMark,
} from '../rules/chatRules';
import {
  canSubmitReport,
  makeListThreads,
  makePrepareMessage,
  makeReportMessage,
  makeSendMessage,
  makeStartThread,
} from '../usecases/ChatUseCases';

const person = (id: string, name = id) => ({ id, name, avatarUrl: null, verified: false });

const thread = (over: Partial<ChatThread> = {}): ChatThread => ({
  id: 't1',
  kind: 'direct',
  title: null,
  postId: null,
  other: person('u-maya', 'Maya Chen'),
  imageUrl: null,
  memberCount: 2,
  lastMessage: {
    id: '101',
    senderId: 'u-maya',
    senderName: 'Maya',
    preview: 'Are we still on?',
    imageCount: 0,
    sentAt: '2026-11-03T10:30:00Z',
  },
  unreadCount: 2,
  activityAt: '2026-11-03T10:30:00Z',
  ...over,
});

const member = (id: string, lastRead: string | null, online = false): ChatMember => ({
  person: person(id),
  role: 'member',
  online,
  lastReadMessageId: lastRead,
});

const detail = (over: Partial<ChatThreadDetail> = {}): ChatThreadDetail => ({
  ...thread(),
  post: null,
  onlineCount: 0,
  members: [member('me', '101'), member('u-maya', '100', true)],
  ...over,
});

const msg = (id: string, senderId: string, sentAt: string, mine = false): ChatMessage => ({
  id,
  clientMsgId: `c-${id}`,
  conversationId: 't1',
  sender: person(senderId),
  mine,
  body: id,
  images: [],
  taggedPost: null,
  taggedPostUnavailable: false,
  removed: false,
  sentAt,
});

const opts = { you: 'You', photos: (n: number) => (n === 1 ? 'Photo' : `${n} photos`) };

describe('message ids', () => {
  it('orders 64-bit ids without rounding them', () => {
    // Both round to the same JS number; as strings they are still told apart.
    expect(Number('9007199254740993')).toBe(Number('9007199254740992'));
    expect(compareMessageIds('9007199254740993', '9007199254740992')).toBeGreaterThan(0);
    expect(compareMessageIds('99', '100')).toBeLessThan(0);
    expect(compareMessageIds('123', '123')).toBe(0);
    expect(isLaterId('5', null)).toBe(true);
    expect(isLaterId('5', '10')).toBe(false);
  });
});

describe('previewLine', () => {
  const group = (senderName: string | null, preview: string) =>
    thread({
      kind: 'group',
      other: null,
      title: 'Crew',
      lastMessage: { ...thread().lastMessage!, senderId: 'u-x', senderName, preview },
    });

  it('shows the text alone in a one-to-one chat', () => {
    expect(previewLine(thread(), opts)).toBe('Are we still on?');
  });

  it('starts your own message with "You:" (the API names every sender but you)', () => {
    const t = thread({ lastMessage: { ...thread().lastMessage!, senderId: 'me', senderName: null, preview: 'On my way' } });
    expect(previewLine(t, opts)).toBe('You: On my way');
    expect(previewLine(group(null, 'See you there'), opts)).toBe('You: See you there');
  });

  it('names a group’s sender from the row itself', () => {
    expect(previewLine(group('Chioma', 'See you!'), opts)).toBe('Chioma: See you!');
    expect(previewLine(group('Deleted user', 'Hi all'), opts)).toBe('Deleted user: Hi all');
  });

  it('does not repeat the name when the message already starts with it', () => {
    expect(previewLine(group('Kofi', 'Kofi shared a spot.'), opts)).toBe('Kofi shared a spot.');
  });

  it('says how many photos when there are no words', () => {
    const t = thread({ lastMessage: { ...thread().lastMessage!, preview: null, imageCount: 3 } });
    expect(previewLine(t, opts)).toBe('3 photos');
  });

  it('is empty with no messages', () => {
    expect(previewLine(thread({ lastMessage: null }), opts)).toBe('');
  });
});

describe('who you are', () => {
  it('is read from your own confirmed messages, or unknown without one', () => {
    expect(myIdFrom([msg('2', 'u-maya', ''), msg('1', 'me', '', true)])).toBe('me');
    expect(myIdFrom([{ ...msg('c-1', 'tmp', '', true), pending: true }])).toBeNull();
    expect(myIdFrom([])).toBeNull();
  });
});

describe('names and presence', () => {
  it('names a direct chat after the person and a group by its title', () => {
    expect(threadName(thread(), 'Group chat')).toBe('Maya Chen');
    expect(threadName(thread({ kind: 'group', other: null, title: 'Crew' }), 'Group chat')).toBe('Crew');
    expect(threadName(thread({ kind: 'group', other: null, title: null }), 'Group chat')).toBe('Group chat');
  });

  it('pictures a direct chat by the person and a group by its post’s cover, or nothing', () => {
    const maya = thread({ other: { ...person('u-maya'), avatarUrl: 'https://a/maya.jpg' } });
    expect(threadAvatar(maya)).toBe('https://a/maya.jpg');
    expect(threadAvatar(thread({ kind: 'group', other: null, imageUrl: 'https://a/cover.jpg' }))).toBe(
      'https://a/cover.jpg',
    );
    expect(threadAvatar(thread({ kind: 'group', other: null, imageUrl: null }))).toBeNull();
  });

  it('counts members and who is online in a group', () => {
    expect(presence(detail({ kind: 'group', other: null, memberCount: 8, onlineCount: 3 }))).toEqual({
      members: 8,
      online: 3,
    });
  });

  it('reads the other person’s online state from the members', () => {
    expect(presence(detail())).toEqual({ online: true });
  });
});

describe('Sent and Read', () => {
  const mine = msg('101', 'me', '', true);

  it('is Read once the other person has read up to it', () => {
    expect(messageStatus(mine, [member('me', '101'), member('u-maya', '100')])).toBe('sent');
    expect(messageStatus(mine, [member('me', '101'), member('u-maya', '101')])).toBe('read');
    expect(messageStatus(mine, [member('me', '101'), member('u-maya', '1000')])).toBe('read');
  });

  it('stays Sent when they hide read receipts', () => {
    expect(messageStatus(mine, [member('me', '101'), member('u-maya', null)])).toBe('sent');
  });

  it('in a group, waits for everyone who shows receipts', () => {
    const members = [member('me', '101'), member('a', '101'), member('b', '99'), member('c', null)];
    expect(messageStatus(mine, members)).toBe('sent');
    expect(messageStatus(mine, withReadMark(members, 'b', '101'))).toBe('read');
  });

  it('never moves a read mark back', () => {
    const members = withReadMark([member('a', '200')], 'a', '150');
    expect(members[0]?.lastReadMessageId).toBe('200');
  });
});

describe('upsertNewest', () => {
  it('replaces the message being sent with the server’s copy, by clientMsgId', () => {
    const pending = { ...msg('c-9', 'me', '', true), clientMsgId: 'c-9', pending: true };
    const server = { ...msg('500', 'me', '', true), clientMsgId: 'c-9' };
    const items = upsertNewest([pending, msg('400', 'x', '')], server);
    expect(items.map((m) => m.id)).toEqual(['500', '400']);
  });

  it('adds a new message once, however often it arrives', () => {
    const once = upsertNewest([msg('400', 'x', '')], msg('401', 'x', ''));
    expect(upsertNewest(once, msg('401', 'x', '')).map((m) => m.id)).toEqual(['401', '400']);
  });

  it('keeps your message on your side when its socket copy (no `mine`) replaces it', () => {
    const sent = { ...msg('500', 'me', '', true), clientMsgId: 'c-9' };
    const socketCopy = { ...msg('500', 'me', ''), clientMsgId: 'c-9' };
    expect(upsertNewest([sent], socketCopy)[0]?.mine).toBe(true);
    const pending = { ...msg('c-9', 'me', '', true), clientMsgId: 'c-9', pending: true };
    expect(upsertNewest([pending], socketCopy)[0]?.mine).toBe(true);
  });

  it('places a socket message from you on another device by your id', () => {
    expect(upsertNewest([], msg('501', 'me', ''), 'me')[0]?.mine).toBe(true);
    expect(upsertNewest([], msg('502', 'u-maya', ''), 'me')[0]?.mine).toBe(false);
  });

  it('never matches two messages on an empty clientMsgId', () => {
    const a = { ...msg('600', 'x', ''), clientMsgId: '' };
    const b = { ...msg('601', 'x', ''), clientMsgId: '' };
    expect(upsertNewest([a], b).map((m) => m.id)).toEqual(['601', '600']);
  });
});

describe('isMine', () => {
  it('only ever turns on', () => {
    expect(isMine(msg('1', 'u-maya', ''), msg('1', 'u-maya', '', true), 'me')).toBe(true);
    expect(isMine(msg('1', 'u-maya', ''), undefined, null)).toBe(false);
    expect(isMine(msg('1', 'me', ''), undefined, 'me')).toBe(true);
  });
});

describe('conversationItems', () => {
  // Local noon, so the day never shifts with the test machine's time zone.
  const day1 = new Date(2026, 10, 2, 12).toISOString();
  const day2a = new Date(2026, 10, 3, 9).toISOString();
  const day2b = new Date(2026, 10, 3, 10).toISOString();

  it('puts a divider before each day and the activity card under the first', () => {
    const items = conversationItems([msg('1', 'u1', day1), msg('2', 'u1', day2a)], {
      group: false,
      hasPost: true,
    });
    expect(items.map((i) => i.kind)).toEqual(['day', 'post', 'message', 'day', 'message']);
  });

  it('names the sender once per run in a group, never yourself', () => {
    const items = conversationItems(
      [msg('1', 'chioma', day2a), msg('2', 'chioma', day2a), msg('3', 'me', day2b, true), msg('4', 'chioma', day2b)],
      { group: true, hasPost: false },
    );
    expect(items.flatMap((i) => (i.kind === 'message' ? [i.showSender] : []))).toEqual([true, false, false, true]);
  });

  it('still shows the activity card with no messages', () => {
    expect(conversationItems([], { group: false, hasPost: true }).map((i) => i.kind)).toEqual(['post']);
  });
});

describe('use cases', () => {
  const repo = (log: unknown[]): ChatRepository => ({
    listThreads: async (_f, search) => {
      log.push(search);
      return { items: [], nextCursor: null };
    },
    startThread: async (target) => {
      log.push(target);
      return detail();
    },
    getThread: async () => detail(),
    getMessages: async () => ({ items: [], nextCursor: null }),
    sendMessage: async (_id, draft) => {
      log.push(draft);
      return msg('1', 'me', '', true);
    },
    markRead: async () => undefined,
    sendTyping: async () => undefined,
    addMember: async () => undefined,
    removeMember: async () => undefined,
    reportMessage: async (_t, _m, reason, details) => {
      log.push([reason, details]);
    },
    getUnreadCount: async () => 0,
  });

  it('trims the search and cuts it to 60 characters', async () => {
    const log: unknown[] = [];
    await makeListThreads(repo(log))('all', `  ${'a'.repeat(80)} `);
    expect(log).toEqual(['a'.repeat(60)]);
  });

  it('starts with exactly one of a person or a post', async () => {
    const log: unknown[] = [];
    const start = makeStartThread(repo(log));
    await start({ userId: 'u-1' });
    await start({ postId: 'p-1' });
    await expect(start({})).rejects.toMatchObject({ code: 'invalid' });
    await expect(start({ userId: 'u', postId: 'p' })).rejects.toBeInstanceOf(ChatError);
    expect(log).toEqual([{ userId: 'u-1' }, { postId: 'p-1' }]);
  });

  it('makes one clientMsgId per message and keeps it in the draft for retries', () => {
    let n = 0;
    const prepare = makePrepareMessage(() => `uuid-${++n}`);
    const draft = prepare('  hello  ');
    expect(draft).toEqual({ clientMsgId: 'uuid-1', body: 'hello', images: [], taggedPostId: null });
    expect(prepare('again').clientMsgId).toBe('uuid-2');
  });

  it('sends words, pictures or both, and refuses anything else', async () => {
    const log: unknown[] = [];
    const send = makeSendMessage(repo(log));
    const draft = (body: string, images = 0): MessageDraft => ({
      clientMsgId: 'c',
      body,
      images: Array.from({ length: images }, (_, i) => ({ uri: `f${i}`, name: 'p.jpg', type: 'image/jpeg' })),
      taggedPostId: null,
    });
    await send('t1', draft('', 1));
    await send('t1', draft(' hi '));
    await expect(send('t1', draft('   '))).rejects.toMatchObject({ code: 'invalid' });
    await expect(send('t1', draft('x'.repeat(2001)))).rejects.toMatchObject({ code: 'invalid' });
    await expect(send('t1', draft('hi', 5))).rejects.toMatchObject({ code: 'invalid' });
    expect(log).toHaveLength(2);
    expect((log[1] as MessageDraft).body).toBe('hi');
    expect(draftProblem('', 0)).toBe('invalid');
  });

  it('needs a note for "Something else" when reporting', async () => {
    const log: unknown[] = [];
    const report = makeReportMessage(repo(log));
    await expect(report('t1', '5', 'other', ' ')).rejects.toMatchObject({ code: 'invalid' });
    await report('t1', '5', 'spam', '');
    await report('t1', '5', 'other', ' rude ');
    expect(log).toEqual([
      ['spam', null],
      ['other', 'rude'],
    ]);
    expect(canSubmitReport(null, '')).toBe(false);
    expect(canSubmitReport('other', '')).toBe(false);
    expect(canSubmitReport('spam', '')).toBe(true);
  });
});
