import { isApiError, type ApiErrorCode } from '@core/api/ApiError';

import type {
  ChatEvent,
  ChatMember,
  ChatMessage,
  ChatPerson,
  ChatPost,
  ChatThread,
  ChatThreadDetail,
  MessagesPage,
  ThreadsPage,
} from '../../domain/entities/Chat';
import { ChatError, type ChatErrorCode } from '../../domain/entities/ChatError';
import type {
  ChatPostCardDto,
  ConversationDetailDto,
  ConversationDto,
  ConversationsPageDto,
  HostCardDto,
  MemberDto,
  MessageDto,
  MessagesPageDto,
  ReadUpdateEventDto,
  TypingEventDto,
} from '../dto/chatDtos';

export const toPerson = (dto: HostCardDto): ChatPerson => ({
  id: dto.id,
  name: dto.displayName,
  avatarUrl: dto.avatarUrl ?? null,
  verified: !!dto.verified,
});

export const toPost = (dto: ChatPostCardDto): ChatPost => ({
  id: dto.id,
  title: dto.title,
  startAt: dto.startAt ?? null,
  placeName: dto.placeName ?? null,
});

// Ids are copied as they come, always as strings: a 64-bit message id read as a
// number would be rounded (spec §1, "Ids").
const id = (value: unknown): string => String(value);
const optionalId = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

export const toThread = (dto: ConversationDto): ChatThread => ({
  id: dto.id,
  kind: dto.kind === 'group' ? 'group' : 'direct',
  title: dto.title ?? null,
  postId: dto.postId ?? null,
  other: dto.other ? toPerson(dto.other) : null,
  memberCount: dto.memberCount ?? 0,
  lastMessage: dto.lastMessage
    ? {
        id: id(dto.lastMessage.id),
        senderId: dto.lastMessage.senderId,
        preview: dto.lastMessage.preview ?? null,
        imageCount: dto.lastMessage.imageCount ?? 0,
        sentAt: dto.lastMessage.createdAt,
      }
    : null,
  unreadCount: Math.min(dto.unreadCount ?? 0, 99),
  activityAt: dto.activityAt,
});

const toMember = (dto: MemberDto): ChatMember => ({
  person: toPerson(dto.user),
  role: dto.role === 'owner' ? 'owner' : 'member',
  online: !!dto.online,
  lastReadMessageId: optionalId(dto.lastReadMessageId),
});

export const toThreadDetail = (dto: ConversationDetailDto): ChatThreadDetail => ({
  ...toThread(dto),
  onlineCount: dto.onlineCount ?? 0,
  members: (dto.members ?? []).map(toMember),
});

export const toMessage = (dto: MessageDto): ChatMessage => ({
  id: id(dto.id),
  clientMsgId: dto.clientMsgId ?? '',
  conversationId: dto.conversationId,
  sender: toPerson(dto.sender),
  mine: !!dto.mine,
  // A removed message keeps no words or pictures on screen, whatever arrives.
  body: dto.removed ? null : (dto.body ?? null),
  images: dto.removed ? [] : (dto.images ?? []).map((i) => ({ thumbUrl: i.thumbUrl, url: i.url })),
  taggedPost: dto.taggedPost && !dto.removed ? toPost(dto.taggedPost) : null,
  taggedPostUnavailable: !!dto.taggedPostUnavailable,
  removed: !!dto.removed,
  sentAt: dto.createdAt,
});

export const toThreadsPage = (dto: ConversationsPageDto): ThreadsPage => ({
  items: (dto.items ?? []).map(toThread),
  nextCursor: dto.nextCursor ?? null,
});

export const toMessagesPage = (dto: MessagesPageDto): MessagesPage => ({
  items: (dto.items ?? []).map(toMessage),
  nextCursor: optionalId(dto.nextCursor),
});

/** A socket event as the domain sees it, or null for a payload it can't read. */
export function toChatEvent(event: string, payload: unknown): ChatEvent | null {
  const p = payload as Record<string, unknown> | null;
  if (event === 'reconnected') return { type: 'reconnected' };
  if (!p || typeof p !== 'object') return null;
  if (event === 'message.new' && typeof p.conversationId === 'string' && p.sender) {
    return { type: 'message', message: toMessage(p as unknown as MessageDto) };
  }
  if (event === 'read.update') {
    const r = p as unknown as ReadUpdateEventDto;
    if (typeof r.conversationId !== 'string' || typeof r.userId !== 'string' || r.messageId == null) return null;
    return { type: 'read', conversationId: r.conversationId, userId: r.userId, messageId: id(r.messageId) };
  }
  if (event === 'typing') {
    const t = p as unknown as TypingEventDto;
    if (typeof t.conversationId !== 'string' || typeof t.userId !== 'string') return null;
    return { type: 'typing', conversationId: t.conversationId, userId: t.userId };
  }
  return null;
}

/** Which call failed: the same code means different things on each (ARCHITECTURE §11). */
export type ChatCall = 'list' | 'start' | 'read' | 'send' | 'members' | 'report' | 'other';

/** What a code means whatever the call. */
const COMMON: Partial<Record<ApiErrorCode, ChatErrorCode>> = {
  VALIDATION_FAILED: 'invalid',
  BAD_REQUEST: 'invalid',
  NOT_FOUND: 'notFound',
  GONE: 'notFound',
  FORBIDDEN: 'notAllowed',
  CONFLICT: 'conflict',
  PAYLOAD_TOO_LARGE: 'tooLarge',
  UNSUPPORTED_MEDIA_TYPE: 'unsupportedImage',
  RATE_LIMITED: 'rateLimited',
  CHAT_START_LIMIT: 'startLimit',
  REPORTING_PAUSED: 'reportingPaused',
  NETWORK: 'network',
  TIMEOUT: 'network',
  UNAUTHORIZED: 'sessionExpired',
};

/** Where a call gives a code its own meaning. */
const BY_CALL: Partial<Record<ChatCall, Partial<Record<ApiErrorCode, ChatErrorCode>>>> = {
  // 403 on start: they only take messages from people they share a post with.
  start: { FORBIDDEN: 'dmRestricted' },
  // 409 on a report: this message is already reported.
  report: { CONFLICT: 'alreadyReported' },
};

/** By the API's code (spec §5), per call. */
export function toChatError(e: unknown, call: ChatCall = 'other'): ChatError {
  if (e instanceof ChatError) return e;
  if (!isApiError(e)) {
    const code = (e as { code?: unknown } | null)?.code;
    return new ChatError(code === 'sessionExpired' ? 'sessionExpired' : 'unknown');
  }
  const code = BY_CALL[call]?.[e.code] ?? COMMON[e.code] ?? 'unknown';
  return new ChatError(code, e.message);
}
