import { describe, expect, it } from '@jest/globals';

import type { ChatMessage, ChatThread } from '../entities/Chat';
import { ChatError } from '../entities/ChatError';
import type { ChatRepository } from '../repositories/ChatRepository';
import { conversationItems, presence, previewLine } from '../rules/chatRules';
import { makeListThreads, makeSendMessage } from '../usecases/ChatUseCases';

const thread = (over: Partial<ChatThread> = {}): ChatThread => ({
  id: 't1',
  kind: 'direct',
  title: 'Maya Chen',
  avatarUrl: null,
  memberCount: null,
  onlineCount: null,
  other: { id: 'u-maya', name: 'Maya Chen', avatarUrl: null, online: true },
  lastMessage: {
    text: 'Are we still on?',
    senderName: 'Maya Chen',
    fromMe: false,
    sentAt: '2026-11-03T10:30:00Z',
  },
  unreadCount: 2,
  post: null,
  ...over,
});

const msg = (id: string, senderId: string, sentAt: string, fromMe = false): ChatMessage => ({
  id,
  sender: { id: senderId, name: senderId, avatarUrl: null },
  fromMe,
  text: id,
  sentAt,
  status: 'sent',
});

describe('previewLine', () => {
  it('shows the text alone in a one-to-one chat', () => {
    expect(previewLine(thread())).toBe('Are we still on?');
  });

  it('starts your own message with "You:"', () => {
    const t = thread({
      lastMessage: { text: 'I’ll send the photos', senderName: 'Me', fromMe: true, sentAt: '' },
    });
    expect(previewLine(t)).toBe('You: I’ll send the photos');
  });

  it('starts a group message with the sender’s first name', () => {
    const t = thread({
      kind: 'group',
      lastMessage: { text: 'See you!', senderName: 'Chioma Obi', fromMe: false, sentAt: '' },
    });
    expect(previewLine(t)).toBe('Chioma: See you!');
  });

  it('does not repeat the name when the message already starts with it', () => {
    const t = thread({
      kind: 'group',
      lastMessage: {
        text: 'Kofi shared a new spot to try.',
        senderName: 'Kofi Mensah',
        fromMe: false,
        sentAt: '',
      },
    });
    expect(previewLine(t)).toBe('Kofi shared a new spot to try.');
  });

  it('is empty with no messages', () => {
    expect(previewLine(thread({ lastMessage: null }))).toBe('');
  });
});

describe('presence', () => {
  it('counts members and who is online in a group', () => {
    expect(presence(thread({ kind: 'group', other: null, memberCount: 8, onlineCount: 3 }))).toEqual({
      members: 8,
      online: 3,
    });
  });

  it('says whether the other person is online', () => {
    expect(presence(thread())).toEqual({ online: true });
  });

  it('has nothing to say without the numbers', () => {
    expect(presence(thread({ kind: 'group', other: null }))).toBeNull();
  });
});

describe('conversationItems', () => {
  // Local noon, so the day never shifts with the test machine's time zone.
  const day1 = new Date(2026, 10, 2, 12).toISOString();
  const day2a = new Date(2026, 10, 3, 9).toISOString();
  const day2b = new Date(2026, 10, 3, 10).toISOString();

  it('puts a divider before each day and the activity card under the first', () => {
    const items = conversationItems([msg('a', 'u1', day1), msg('b', 'u1', day2a)], {
      group: false,
      hasPost: true,
    });
    expect(items.map((i) => i.kind)).toEqual(['day', 'post', 'message', 'day', 'message']);
  });

  it('names the sender once per run in a group, never yourself', () => {
    const items = conversationItems(
      [
        msg('a', 'chioma', day2a),
        msg('b', 'chioma', day2a),
        msg('c', 'me', day2b, true),
        msg('d', 'chioma', day2b),
      ],
      { group: true, hasPost: false },
    );
    const shown = items.flatMap((i) => (i.kind === 'message' ? [[i.key, i.showSender]] : []));
    expect(shown).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
      ['d', true],
    ]);
  });

  it('never names senders in a one-to-one chat', () => {
    const items = conversationItems([msg('a', 'maya', day1)], { group: false, hasPost: false });
    expect(items.some((i) => i.kind === 'message' && i.showSender)).toBe(false);
  });

  it('still shows the activity card with no messages', () => {
    expect(conversationItems([], { group: false, hasPost: true }).map((i) => i.kind)).toEqual(['post']);
  });
});

describe('sending', () => {
  const repo = (sent: string[]): ChatRepository => ({
    listThreads: async () => ({ items: [], nextCursor: null }),
    getThread: async () => thread(),
    getMessages: async () => ({ items: [], nextCursor: null }),
    sendMessage: async (_id, text) => {
      sent.push(text);
      return msg('new', 'me', '', true);
    },
    markRead: async () => undefined,
  });

  it('trims the text before it goes', async () => {
    const sent: string[] = [];
    await makeSendMessage(repo(sent))('t1', '  hello  ');
    expect(sent).toEqual(['hello']);
  });

  it('refuses an empty message or one that is too long', async () => {
    const sent: string[] = [];
    const send = makeSendMessage(repo(sent));
    await expect(send('t1', '   ')).rejects.toBeInstanceOf(ChatError);
    await expect(send('t1', 'x'.repeat(2001))).rejects.toMatchObject({ code: 'invalid' });
    expect(sent).toEqual([]);
  });

  it('trims the search before listing', async () => {
    const queries: string[] = [];
    const r = repo([]);
    r.listThreads = async (_f, q) => {
      queries.push(q);
      return { items: [], nextCursor: null };
    };
    await makeListThreads(r)('all', '  maya ', null);
    expect(queries).toEqual(['maya']);
  });
});
