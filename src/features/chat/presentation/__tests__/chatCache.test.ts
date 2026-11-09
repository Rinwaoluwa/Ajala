import { describe, expect, it } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type { ChatMessage, ChatThread, ChatThreadDetail, MessagesPage, ThreadsPage } from '../../domain/entities/Chat';
import { applyChatEvent, dropMessage, dropPostThreads, dropThread } from '../state/chatCache';
import { chatKeys, type TypingState } from '../state/chatQueries';

const message = (id: string, clientMsgId = `c-${id}`): ChatMessage => ({
  id,
  clientMsgId,
  conversationId: 'c1',
  sender: { id: 'u', name: 'U', avatarUrl: null, verified: false },
  mine: false,
  body: id,
  images: [],
  taggedPost: null,
  taggedPostUnavailable: false,
  removed: false,
  sentAt: '2026-11-03T09:00:00Z',
});

// No garbage-collection timers, so nothing is left running after the tests.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

const seeded = () => {
  const client = newClient();
  client.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages('c1'), {
    pages: [{ items: [message('20'), message('19')], nextCursor: '19' }],
    pageParams: [null],
  });
  return client;
};
const ids = (client: QueryClient) =>
  client
    .getQueryData<InfiniteData<MessagesPage>>(chatKeys.messages('c1'))
    ?.pages.flatMap((p) => p.items.map((m) => m.id));

describe('socket events into the cache', () => {
  it('adds a new message once, even when heard twice', () => {
    const client = seeded();
    applyChatEvent(client, { type: 'message', message: message('21') });
    applyChatEvent(client, { type: 'message', message: message('21') });
    expect(ids(client)).toEqual(['21', '20', '19']);
  });

  it('leaves a conversation that was never opened alone', () => {
    const client = newClient();
    applyChatEvent(client, { type: 'message', message: message('1') });
    expect(client.getQueryData(chatKeys.messages('c1'))).toBeUndefined();
  });

  it('moves a member’s read mark forward only', () => {
    const client = newClient();
    client.setQueryData<Partial<ChatThreadDetail>>(chatKeys.thread('c1'), {
      members: [
        { person: { id: 'u', name: 'U', avatarUrl: null, verified: false }, role: 'member', online: true, lastReadMessageId: '10' },
      ],
    });
    applyChatEvent(client, { type: 'read', conversationId: 'c1', userId: 'u', messageId: '9' });
    applyChatEvent(client, { type: 'read', conversationId: 'c1', userId: 'u', messageId: '12' });
    expect(client.getQueryData<ChatThreadDetail>(chatKeys.thread('c1'))?.members[0]?.lastReadMessageId).toBe('12');
  });

  it('remembers who is typing, for five seconds', () => {
    const client = newClient();
    const before = Date.now();
    applyChatEvent(client, { type: 'typing', conversationId: 'c1', userId: 'u' });
    const until = client.getQueryData<TypingState>(chatKeys.typing('c1'))?.u ?? 0;
    expect(until - before).toBeGreaterThanOrEqual(5000);
  });

  it('places a socket message by your id, and never flips your own across', () => {
    const client = newClient();
    const mine = { ...message('20'), sender: { id: 'me', name: 'Me', avatarUrl: null, verified: false }, mine: true };
    client.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages('c1'), {
      pages: [{ items: [mine], nextCursor: null }],
      pageParams: [null],
    });
    // The socket's copy of your own message: no `mine`, and auth's id not known yet.
    applyChatEvent(client, { type: 'message', message: { ...mine, mine: false } });
    // From you on another device, then from someone else.
    applyChatEvent(client, { type: 'message', message: { ...mine, id: '21', clientMsgId: 'c-21', mine: false } }, 'me');
    applyChatEvent(client, { type: 'message', message: message('22') }, 'me');
    const items = client.getQueryData<InfiniteData<MessagesPage>>(chatKeys.messages('c1'))?.pages[0]?.items ?? [];
    expect(items.map((m) => [m.id, m.mine])).toEqual([
      ['22', false],
      ['21', true],
      ['20', true],
    ]);
  });

  it('refreshes whatever shows a post when its RSVP changes', async () => {
    const client = newClient();
    client.setQueryData(['postDetail', 'post', 'p1'], { id: 'p1' });
    client.setQueryData(['explore', 'post', 'p1'], { id: 'p1' });
    client.setQueryData(['postDetail', 'post', 'p2'], { id: 'p2' });
    applyChatEvent(client, { type: 'rsvp', postId: 'p1' });
    const stale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    expect(stale(['postDetail', 'post', 'p1'])).toBe(true);
    expect(stale(['explore', 'post', 'p1'])).toBe(true);
    expect(stale(['postDetail', 'post', 'p2'])).toBe(false);
  });

  it('takes a failed send back out', () => {
    const client = seeded();
    dropMessage(client, 'c1', 'c-20');
    expect(ids(client)).toEqual(['19']);
  });
});

describe('a chat that is gone (404)', () => {
  const row = (id: string, over: Partial<ChatThread> = {}): ChatThread => ({
    id,
    kind: 'group',
    title: id,
    postId: `p-${id}`,
    other: null,
    imageUrl: null,
    memberCount: 3,
    lastMessage: null,
    unreadCount: 0,
    activityAt: 'x',
    ...over,
  });
  const withLists = () => {
    const client = newClient();
    for (const filter of ['all', 'groups'] as const) {
      client.setQueryData<InfiniteData<ThreadsPage>>(chatKeys.threads(filter, ''), {
        pages: [{ items: [row('c1'), row('c2')], nextCursor: 'n' }, { items: [row('c3')], nextCursor: null }],
        pageParams: [null, 'n'],
      });
    }
    return client;
  };
  const listed = (client: QueryClient, filter: 'all' | 'groups') =>
    client
      .getQueryData<InfiniteData<ThreadsPage>>(chatKeys.threads(filter, ''))
      ?.pages.flatMap((p) => p.items.map((t) => t.id));

  it('leaves every cached list, whichever page it was on', () => {
    const client = withLists();
    dropThread(client, 'c3');
    expect(listed(client, 'all')).toEqual(['c1', 'c2']);
    expect(listed(client, 'groups')).toEqual(['c1', 'c2']);
  });

  it('forgets what was cached for it once nothing shows it', () => {
    const client = seeded();
    dropThread(client, 'c1');
    expect(client.getQueryData(chatKeys.messages('c1'))).toBeUndefined();
  });

  it('drops a post’s group chat that isn’t there for you', () => {
    const client = withLists();
    dropPostThreads(client, 'p-c2');
    expect(listed(client, 'all')).toEqual(['c1', 'c3']);
  });
});

describe('the Messages badge', () => {
  const stale = (client: QueryClient) => client.getQueryState(chatKeys.unreadCount)?.isInvalidated;

  it('is asked again when a message arrives, live or by push', () => {
    for (const event of [
      { type: 'message', message: message('30') },
      { type: 'pushed', conversationId: 'c1' },
    ] as const) {
      const client = seeded();
      client.setQueryData(chatKeys.unreadCount, 2);
      applyChatEvent(client, event);
      expect(stale(client)).toBe(true);
    }
  });

  it('is asked again when you read on another device, and not for someone else’s read', () => {
    const client = seeded();
    client.setQueryData<InfiniteData<MessagesPage>>(chatKeys.messages('c1'), {
      pages: [{ items: [{ ...message('20'), mine: true, sender: { id: 'me', name: 'Me', avatarUrl: null, verified: false } }], nextCursor: null }],
      pageParams: [null],
    });
    client.setQueryData(chatKeys.unreadCount, 2);
    applyChatEvent(client, { type: 'read', conversationId: 'c1', userId: 'u-other', messageId: '20' });
    expect(stale(client)).toBe(false);
    applyChatEvent(client, { type: 'read', conversationId: 'c1', userId: 'me', messageId: '20' });
    expect(stale(client)).toBe(true);
  });
});
