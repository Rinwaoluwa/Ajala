/**
 * PROPOSED — chat is not in the API yet (API map: "Chat is not built yet"). The
 * shapes the app expects, for the backend to confirm (see the README).
 */

export interface ChatUserDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChatThreadDto {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  avatarUrl: string | null;
  memberCount: number | null;
  onlineCount: number | null;
  /** Direct only. */
  other: (ChatUserDto & { online: boolean }) | null;
  lastMessage: { text: string; senderName: string; fromMe: boolean; sentAt: string } | null;
  unreadCount: number;
  post: { id: string; title: string; startAt: string | null; placeName: string | null } | null;
}

export interface MessageDto {
  id: string;
  sender: ChatUserDto;
  fromMe: boolean;
  text: string;
  sentAt: string;
  status: 'sent' | 'read';
}

export interface ThreadsPageDto {
  items: ChatThreadDto[];
  nextCursor: string | null;
}

/** Newest first. */
export interface MessagesPageDto {
  items: MessageDto[];
  nextCursor: string | null;
}
