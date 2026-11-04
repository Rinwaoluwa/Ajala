import { isApiError } from '@core/api/ApiError';

import type { ChatMessage, ChatThread, MessagesPage, ThreadsPage } from '../../domain/entities/Chat';
import { ChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import type { ChatThreadDto, MessageDto, MessagesPageDto, ThreadsPageDto } from '../dto/chatDtos';

export const toThread = (dto: ChatThreadDto): ChatThread => ({
  id: dto.id,
  kind: dto.kind === 'group' ? 'group' : 'direct',
  title: dto.title,
  avatarUrl: dto.avatarUrl ?? null,
  memberCount: dto.memberCount ?? null,
  onlineCount: dto.onlineCount ?? null,
  other: dto.other
    ? {
        id: dto.other.id,
        name: dto.other.displayName,
        avatarUrl: dto.other.avatarUrl ?? null,
        online: !!dto.other.online,
      }
    : null,
  lastMessage: dto.lastMessage ?? null,
  unreadCount: dto.unreadCount ?? 0,
  post: dto.post ?? null,
});

export const toMessage = (dto: MessageDto): ChatMessage => ({
  id: dto.id,
  sender: { id: dto.sender.id, name: dto.sender.displayName, avatarUrl: dto.sender.avatarUrl ?? null },
  fromMe: !!dto.fromMe,
  text: dto.text,
  sentAt: dto.sentAt,
  status: dto.status === 'read' ? 'read' : 'sent',
});

export const toThreadsPage = (dto: ThreadsPageDto): ThreadsPage => ({
  items: (dto.items ?? []).map(toThread),
  nextCursor: dto.nextCursor ?? null,
});

export const toMessagesPage = (dto: MessagesPageDto): MessagesPage => ({
  items: (dto.items ?? []).map(toMessage),
  nextCursor: dto.nextCursor ?? null,
});

/**
 * By the API's code (spec §5). Chat is a proposed endpoint: while the API has no
 * such route it answers 404 or 405, which here means "not available yet".
 */
export function toChatError(e: unknown): ChatError {
  if (e instanceof ChatError) return e;
  if (!isApiError(e)) {
    const code = (e as { code?: unknown } | null)?.code;
    return new ChatError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }
  const byCode: Partial<Record<string, ChatErrorCode>> = {
    NOT_FOUND: 'unavailable',
    METHOD_NOT_ALLOWED: 'unavailable',
    VALIDATION_FAILED: 'invalid',
    FORBIDDEN: 'notAllowed',
    RATE_LIMITED: 'rateLimited',
    NETWORK: 'network',
    TIMEOUT: 'network',
    UNAUTHORIZED: 'sessionExpired',
  };
  return new ChatError(byCode[e.code] ?? 'unknown', e.message);
}
