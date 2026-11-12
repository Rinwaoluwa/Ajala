/**
 * The chat API's wire shapes, copied from the client spec
 * (`docs/api/ajala-api-users-common.md` §6, "chat"), with the additions in
 * `docs/api/backend-answers-2026-11-09.md` (B2–B5), which wins until the spec
 * is re-synced from Swagger.
 */

/** `HostCardDto`: how the API draws a person on a card. */
export interface HostCardDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface LastMessageDto {
  /** 64-bit id as a string: never parse it as a number. */
  id: string;
  senderId: string;
  /** The sender's first name (B2). Null for my own messages; "Deleted user" for a wiped account. */
  senderName: string | null;
  /** First 120 characters. */
  preview: string | null;
  imageCount: number;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  postId: string | null;
  /** Direct only. */
  other: HostCardDto | null;
  /** The post's cover at 200 px (B3). Null in a direct chat and when I can't see the post. */
  imageUrl: string | null;
  memberCount: number;
  lastMessage: LastMessageDto | null;
  /** Capped at 99. */
  unreadCount: number;
  activityAt: string;
}

export interface MemberDto {
  user: HostCardDto;
  role: 'owner' | 'member';
  /** Lags a disconnect by up to 90 s. */
  online: boolean;
  /** Null when they hide it. */
  lastReadMessageId: string | null;
}

export interface ConversationDetailDto extends ConversationDto {
  /**
   * The post as a card (B4), with my own `rsvpState` and `saved`; its
   * `distanceKm` is always null. Null when there is no post or I can't see it.
   */
  post: ChatPostCardDto | null;
  onlineCount: number;
  /** Host first. */
  members: MemberDto[];
}

export interface ConversationsPageDto {
  items: ConversationDto[];
  nextCursor: string | null;
}

export interface MessageImageDto {
  /** 320px, lasts 1 hour. */
  thumbUrl: string;
  /** 1600px, lasts 1 hour. */
  url: string;
}

/**
 * The fields of `PostCardDto` the chat reads (a tagged post, the activity card).
 * The API sends the whole card; the rest is ignored here.
 */
export interface ChatPostCardDto {
  id: string;
  title: string;
  startAt: string | null;
  placeName: string | null;
  /** True when the reader may not open it; `lockReason` says why (MOB-077). */
  locked?: boolean | null;
  lockReason?: 'plan' | 'distance' | null;
}

export interface MessageDto {
  /** 64-bit id as a string. */
  id: string;
  conversationId: string;
  sender: HostCardDto;
  /** Null once a moderator removed it. */
  body: string | null;
  images: MessageImageDto[];
  taggedPost: ChatPostCardDto | null;
  taggedPostUnavailable: boolean;
  clientMsgId: string;
  removed: boolean;
  mine: boolean;
  createdAt: string;
}

/** Newest first; `nextCursor` is the value to send as `before`. */
export interface MessagesPageDto {
  items: MessageDto[];
  nextCursor: string | null;
}

/** `GET /conversations/unread-count` (B5): conversations with anything unread, not messages. */
export interface UnreadCountDto {
  count: number;
}

/** Exactly one of the two. */
export type StartConversationDto = { userId: string } | { postId: string };
export interface ReadUpToDto {
  messageId: string;
}
export interface AddMemberDto {
  userId: string;
}
export interface ReportMessageDto {
  reason: 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
  details?: string;
}
export interface ReportFiledDto {
  id: string;
}

/** Socket `read.update`. */
export interface ReadUpdateEventDto {
  conversationId: string;
  userId: string;
  messageId: string;
}
/** Socket `typing`. */
export interface TypingEventDto {
  conversationId: string;
  userId: string;
}
