import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { ChatError } from '../../domain/entities/ChatError';
import { toChatError, toMessagesPage, toThread } from '../mappers/chatMappers';

describe('chat over the API', () => {
  it('reads a missing route as "not available yet"', () => {
    expect(toChatError(new ApiError({ code: 'NOT_FOUND', message: 'no route', status: 404 })).code).toBe(
      'unavailable',
    );
    expect(toChatError(new ApiError({ code: 'METHOD_NOT_ALLOWED', message: 'no', status: 405 })).code).toBe(
      'unavailable',
    );
  });

  it('maps the other API codes', () => {
    const code = (c: ConstructorParameters<typeof ApiError>[0]['code']) =>
      toChatError(new ApiError({ code: c, message: '' })).code;
    expect(code('NETWORK')).toBe('network');
    expect(code('TIMEOUT')).toBe('network');
    expect(code('VALIDATION_FAILED')).toBe('invalid');
    expect(code('FORBIDDEN')).toBe('notAllowed');
    expect(code('RATE_LIMITED')).toBe('rateLimited');
    expect(code('UNAUTHORIZED')).toBe('sessionExpired');
  });

  it('keeps a ChatError and calls anything else unknown', () => {
    const e = new ChatError('invalid');
    expect(toChatError(e)).toBe(e);
    expect(toChatError(new Error('boom')).code).toBe('unknown');
  });

  it('fills the gaps in a thread', () => {
    const t = toThread({
      id: 'c1',
      kind: 'direct',
      title: 'Maya Chen',
      other: { id: 'u', displayName: 'Maya Chen', avatarUrl: null, online: true },
    } as never);
    expect(t).toMatchObject({
      avatarUrl: null,
      memberCount: null,
      lastMessage: null,
      unreadCount: 0,
      post: null,
      other: { id: 'u', name: 'Maya Chen', online: true },
    });
  });

  it('reads a page of messages', () => {
    const page = toMessagesPage({
      items: [
        {
          id: 'm1',
          sender: { id: 'me', displayName: 'Ada', avatarUrl: null },
          fromMe: true,
          text: 'Hi',
          sentAt: '2026-11-03T09:00:00Z',
          status: 'read',
        },
      ],
      nextCursor: '30',
    });
    expect(page.nextCursor).toBe('30');
    expect(page.items[0]).toMatchObject({ fromMe: true, status: 'read', sender: { name: 'Ada' } });
  });
});
