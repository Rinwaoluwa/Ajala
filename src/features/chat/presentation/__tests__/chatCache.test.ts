import { describe, expect, it } from '@jest/globals';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import type { ChatMessage, ChatThreadDetail, MessagesPage } from '../../domain/entities/Chat';
import { applyChatEvent, dropMessage } from '../state/chatCache';
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

  it('takes a failed send back out', () => {
    const client = seeded();
    dropMessage(client, 'c1', 'c-20');
    expect(ids(client)).toEqual(['19']);
  });
});
