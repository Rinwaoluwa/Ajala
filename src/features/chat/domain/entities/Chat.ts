/**
 * Conversations and their messages (Figma Messages, Chat 1:1, Chat group).
 *
 * The API has no chat yet (API map: "Chat is not built yet"); these follow the
 * PROPOSED endpoints in `data/datasources/remote/chatApi.ts`, written down in
 * the README for the backend to confirm.
 */

/** The pills over the list: every conversation, the unread ones, groups only. */
export type ChatFilter = 'all' | 'unread' | 'groups';

export type ChatKind = 'direct' | 'group';

export type ChatPerson = { id: string; name: string; avatarUrl: string | null };

export type ChatThread = {
  id: string;
  kind: ChatKind;
  /** The other person's name, or the group's. */
  title: string;
  avatarUrl: string | null;
  /** Groups only. */
  memberCount: number | null;
  onlineCount: number | null;
  /** Direct only: the other person, and whether they are online now. */
  other: (ChatPerson & { online: boolean }) | null;
  lastMessage: { text: string; senderName: string; fromMe: boolean; sentAt: string } | null;
  unreadCount: number;
  /** The activity the conversation is about, shown at its top. */
  post: { id: string; title: string; startAt: string | null; placeName: string | null } | null;
};

export type ChatMessage = {
  id: string;
  sender: ChatPerson;
  fromMe: boolean;
  text: string;
  /** ISO date-time. */
  sentAt: string;
  status: 'sent' | 'read';
  /** Sent, not yet confirmed (drawn dimmed). */
  pending?: boolean;
};

export type ThreadsPage = { items: ChatThread[]; nextCursor: string | null };
/** Newest first, as the API pages them; the screen shows them oldest first. */
export type MessagesPage = { items: ChatMessage[]; nextCursor: string | null };
