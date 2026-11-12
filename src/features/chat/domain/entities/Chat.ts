/**
 * Conversations and their messages (Figma Messages, Chat 1:1, Chat group), as
 * the chat API describes them (spec §2.18, §3.9, types in §6).
 *
 * Message ids are 64-bit numbers sent as strings. They stay strings here: a JS
 * number loses precision past 2^53, so two different ids could compare equal.
 * `compareMessageIds` in the rules orders them without parsing.
 */

/** The pills over the list: every conversation, the unread ones, groups only (`tab`). */
export type ChatFilter = 'all' | 'unread' | 'groups';

export type ChatKind = 'direct' | 'group';

export type ChatPerson = { id: string; name: string; avatarUrl: string | null; verified: boolean };

/** The list's last line. */
export type LastMessage = {
  id: string;
  senderId: string;
  /**
   * The sender's first name, for a group's "Chioma: …". Null for your own
   * message, which is how "You: …" is told apart; "Deleted user" for a wiped account.
   */
  senderName: string | null;
  /** The first 120 characters; null for a picture-only or removed message. */
  preview: string | null;
  imageCount: number;
  sentAt: string;
};

/** A row in the Messages list (`ConversationDto`). */
export type ChatThread = {
  id: string;
  kind: ChatKind;
  /** A group's name. Null for a direct chat, which is named after `other`. */
  title: string | null;
  /** The activity a group chat (or a chat started from a post) belongs to. */
  postId: string | null;
  /** Direct only: the other person. */
  other: ChatPerson | null;
  /**
   * A group's picture: its post's cover at 200 px. Null for a direct chat (which
   * shows the other person) and when you can't see the post.
   */
  imageUrl: string | null;
  memberCount: number;
  lastMessage: LastMessage | null;
  /** Capped at 99 by the API. */
  unreadCount: number;
  activityAt: string;
};

export type ChatMember = {
  person: ChatPerson;
  role: 'owner' | 'member';
  /** Lags a disconnect by up to 90 seconds. */
  online: boolean;
  /** How far they have read; null when they hide read receipts. */
  lastReadMessageId: string | null;
};

/** One conversation opened (`ConversationDetailDto`): the row plus who is in it and its post. */
export type ChatThreadDetail = ChatThread & {
  /** The activity card at the top of the chat; null when there is no post or you can't see it. */
  post: ChatPost | null;
  onlineCount: number;
  /** The host first. */
  members: ChatMember[];
};

export type ChatImage = { thumbUrl: string; url: string };

/** A post a message points at (and the activity card at the top of a chat). */
/** Why a post is locked to its reader (MOB-077): a Plan, or outside their area, without Pro. */
export type ChatPostLock = 'plan' | 'distance';

export type ChatPost = {
  id: string;
  title: string;
  startAt: string | null;
  placeName: string | null;
  /** Null when the reader may open it. A locked card opens the paywall, not the post. */
  lockReason: ChatPostLock | null;
};

export type ChatMessage = {
  /** The server's 64-bit id as a string, or the `clientMsgId` while it is on its way. */
  id: string;
  /** The app's own uuid for the send; a retry reuses it and gets the first message back. */
  clientMsgId: string;
  conversationId: string;
  sender: ChatPerson;
  mine: boolean;
  /** Null once a moderator removed it, or for pictures alone. */
  body: string | null;
  /** Their links last an hour: never keep them longer than the thread is cached. */
  images: ChatImage[];
  taggedPost: ChatPost | null;
  /** The tagged post was deleted or hidden: say "no longer available". */
  taggedPostUnavailable: boolean;
  /** Removed by a moderator: "This message was removed". */
  removed: boolean;
  /** ISO date-time. */
  sentAt: string;
  /** Sent, not yet confirmed (drawn dimmed). */
  pending?: boolean;
};

/** A photo picked on the phone, already resized and compressed for upload. */
export type LocalImage = { uri: string; name: string; type: string };

/** What the composer sends. `clientMsgId` is made once and kept for every retry. */
export type MessageDraft = {
  clientMsgId: string;
  body: string;
  images: LocalImage[];
  taggedPostId: string | null;
};

/** Who to open a chat with (`StartConversationDto`): a person, or a post's group. */
export type StartTarget = { userId: string } | { postId: string };

export type ReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';

export type ThreadsPage = { items: ChatThread[]; nextCursor: string | null };
/** Newest first, as the API pages them; `nextCursor` is the next `before`. */
export type MessagesPage = { items: ChatMessage[]; nextCursor: string | null };

/** What the live connection reports (socket `/chat`), plus chat pushes that arrive while the app is open. */
export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'read'; conversationId: string; userId: string; messageId: string }
  | { type: 'typing'; conversationId: string; userId: string }
  /** A chat push arrived while the app was open: that conversation has something new. */
  | { type: 'pushed'; conversationId: string }
  /** My own RSVP on a post changed (`rsvp.update`): whatever shows that post is out of date. */
  | { type: 'rsvp'; postId: string }
  /** Connected again after a drop: anything may have been missed. */
  | { type: 'reconnected' };
