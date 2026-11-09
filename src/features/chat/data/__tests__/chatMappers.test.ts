import { describe, expect, it } from '@jest/globals';

import { ApiError, type ApiErrorCode } from '@core/api/ApiError';

import { ChatError } from '../../domain/entities/ChatError';
import type { MessageDto } from '../dto/chatDtos';
import {
  toChatError,
  toChatEvent,
  toChatPushEvent,
  toMessage,
  toMessagesPage,
  toThreadDetail,
  toThreadsPage,
} from '../mappers/chatMappers';

const api = (code: ApiErrorCode) => new ApiError({ code, message: '' });

const card = (id: string, displayName = id) => ({ id, displayName, avatarUrl: null, verified: false });

const messageDto = (over: Partial<MessageDto> = {}): MessageDto => ({
  id: '9007199254740993',
  conversationId: 'c1',
  sender: card('u-maya', 'Maya Chen'),
  body: 'Hi',
  images: [{ thumbUrl: 't', url: 'u' }],
  taggedPost: { id: 'p1', title: 'Walk', startAt: null, placeName: 'Lekki' },
  taggedPostUnavailable: false,
  clientMsgId: 'uuid-1',
  removed: false,
  mine: false,
  createdAt: '2026-11-03T09:00:00Z',
  ...over,
});

describe('chat errors', () => {
  it('maps the API codes', () => {
    expect(toChatError(api('NETWORK')).code).toBe('network');
    expect(toChatError(api('TIMEOUT')).code).toBe('network');
    expect(toChatError(api('VALIDATION_FAILED')).code).toBe('invalid');
    expect(toChatError(api('NOT_FOUND')).code).toBe('notFound');
    expect(toChatError(api('RATE_LIMITED')).code).toBe('rateLimited');
    expect(toChatError(api('UNAUTHORIZED')).code).toBe('sessionExpired');
    expect(toChatError(api('PAYLOAD_TOO_LARGE'), 'send').code).toBe('tooLarge');
    expect(toChatError(api('UNSUPPORTED_MEDIA_TYPE'), 'send').code).toBe('unsupportedImage');
  });

  it('reads a 403 by the call it came from', () => {
    expect(toChatError(api('FORBIDDEN'), 'start').code).toBe('dmRestricted');
    expect(toChatError(api('FORBIDDEN'), 'send').code).toBe('notAllowed');
  });

  it('knows the start limit, conflicts and report refusals', () => {
    expect(toChatError(api('CHAT_START_LIMIT'), 'start').code).toBe('startLimit');
    expect(toChatError(api('CONFLICT'), 'start').code).toBe('conflict');
    expect(toChatError(api('CONFLICT'), 'report').code).toBe('alreadyReported');
    expect(toChatError(api('REPORTING_PAUSED'), 'report').code).toBe('reportingPaused');
  });

  it('reads a full group chat as a wait, not a conflict', () => {
    expect(toChatError(api('GROUP_CHAT_FULL'), 'start').code).toBe('groupChatFull');
  });

  it('no longer reads a missing route as "not available yet"', () => {
    expect(toChatError(api('METHOD_NOT_ALLOWED')).code).toBe('unknown');
  });

  it('keeps a ChatError and calls anything else unknown', () => {
    const e = new ChatError('invalid');
    expect(toChatError(e)).toBe(e);
    expect(toChatError(new Error('boom')).code).toBe('unknown');
  });
});

describe('chat shapes', () => {
  it('keeps a 64-bit message id exactly as sent', () => {
    expect(toMessage(messageDto()).id).toBe('9007199254740993');
  });

  it('reads a message', () => {
    expect(toMessage(messageDto())).toMatchObject({
      clientMsgId: 'uuid-1',
      sender: { id: 'u-maya', name: 'Maya Chen' },
      body: 'Hi',
      images: [{ thumbUrl: 't', url: 'u' }],
      taggedPost: { id: 'p1', title: 'Walk' },
      mine: false,
      sentAt: '2026-11-03T09:00:00Z',
    });
  });

  it('shows nothing of a removed message', () => {
    expect(toMessage(messageDto({ removed: true }))).toMatchObject({
      removed: true,
      body: null,
      images: [],
      taggedPost: null,
    });
  });

  it('reads a conversation with its members, read marks, picture and post', () => {
    const t = toThreadDetail({
      id: 'c1',
      kind: 'group',
      title: 'Crew',
      postId: 'p1',
      other: null,
      imageUrl: 'https://img/cover-200.jpg',
      memberCount: 2,
      lastMessage: { id: '7', senderId: 'u-a', senderName: 'Ada', preview: null, imageCount: 2, createdAt: 'x' },
      unreadCount: 150,
      activityAt: 'x',
      post: { id: 'p1', title: 'Walk', startAt: '2026-11-08T09:00:00Z', placeName: 'Lekki' },
      onlineCount: 1,
      members: [
        { user: card('u-a'), role: 'owner', online: true, lastReadMessageId: '7' },
        { user: card('u-b'), role: 'member', online: false, lastReadMessageId: null },
      ],
    });
    expect(t).toMatchObject({
      kind: 'group',
      title: 'Crew',
      unreadCount: 99,
      imageUrl: 'https://img/cover-200.jpg',
      post: { id: 'p1', title: 'Walk', startAt: '2026-11-08T09:00:00Z', placeName: 'Lekki' },
      lastMessage: { id: '7', senderName: 'Ada', imageCount: 2, preview: null, sentAt: 'x' },
      members: [
        { role: 'owner', lastReadMessageId: '7', online: true },
        { role: 'member', lastReadMessageId: null },
      ],
    });
  });

  it('has no picture, post or sender name where the API sends none', () => {
    const page = toThreadsPage({
      items: [
        {
          id: 'c2',
          kind: 'direct',
          title: null,
          postId: null,
          other: card('u-maya'),
          imageUrl: null,
          memberCount: 2,
          lastMessage: { id: '9', senderId: 'me', senderName: null, preview: 'Hi', imageCount: 0, createdAt: 'x' },
          unreadCount: 0,
          activityAt: 'x',
        },
      ],
      nextCursor: null,
    });
    expect(page.items[0]).toMatchObject({ imageUrl: null, lastMessage: { senderName: null } });
  });

  it('reads a page of messages, whose cursor is the next `before`', () => {
    const page = toMessagesPage({ items: [messageDto()], nextCursor: '9007199254740990' });
    expect(page.nextCursor).toBe('9007199254740990');
  });

  it('reads socket events and drops ones it can’t', () => {
    expect(toChatEvent('message.new', messageDto())).toMatchObject({ type: 'message' });
    expect(toChatEvent('read.update', { conversationId: 'c1', userId: 'u', messageId: '8' })).toEqual({
      type: 'read',
      conversationId: 'c1',
      userId: 'u',
      messageId: '8',
    });
    expect(toChatEvent('typing', { conversationId: 'c1', userId: 'u' })).toEqual({
      type: 'typing',
      conversationId: 'c1',
      userId: 'u',
    });
    expect(toChatEvent('reconnected', undefined)).toEqual({ type: 'reconnected' });
    expect(toChatEvent('typing', null)).toBeNull();
    expect(toChatEvent('rsvp.update', { postId: 'p', state: 'going', goingCount: 3 })).toEqual({
      type: 'rsvp',
      postId: 'p',
    });
    expect(toChatEvent('rsvp.update', { state: 'going' })).toBeNull();
    expect(toChatEvent('session.expiring', { inMs: 1000 })).toBeNull();
  });

  it('reads a socket message without `mine` as not (yet) yours', () => {
    const { mine: _mine, ...withoutMine } = messageDto();
    const event = toChatEvent('message.new', withoutMine);
    expect(event).toMatchObject({ type: 'message', message: { mine: false } });
  });

  it('reads a chat push as "this conversation moved", and ignores every other push', () => {
    expect(toChatPushEvent({ kind: 'chat.message', conversationId: 'c1' })).toEqual({
      type: 'pushed',
      conversationId: 'c1',
    });
    expect(toChatPushEvent({ kind: 'chat.message' })).toBeNull();
    expect(toChatPushEvent({ kind: 'post.details_changed', postId: 'p1' })).toBeNull();
    expect(toChatPushEvent({})).toBeNull();
  });
});
