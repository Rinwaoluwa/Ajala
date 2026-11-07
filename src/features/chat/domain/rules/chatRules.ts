import type { ChatMember, ChatMessage, ChatThread, ChatThreadDetail } from '../entities/Chat';

/** Longest message body (spec §4). */
export const MESSAGE_MAX = 2000;
/** Most pictures on one message (spec §4). */
export const IMAGES_MAX = 4;
/** Longest search the list sends (`search` ≤ 60). */
export const SEARCH_MAX = 60;
/** Longest note on a report (spec §4). */
export const REPORT_DETAILS_MAX = 500;
export const THREADS_PAGE = 20;
/** The API's default for messages; its maximum is 50. */
export const MESSAGES_PAGE = 30;
/** "At most every 3 s" (spec §2.18): the gap between two typing signals. */
export const TYPING_INTERVAL_MS = 3000;
/** How long someone shows as typing after their last signal. */
export const TYPING_SHOWN_MS = 5000;

/**
 * Orders two message ids without turning them into numbers: they are 64-bit
 * and a JS number would round them. Decimal strings without leading zeros
 * compare by length first, then digit by digit. Negative: a is older.
 */
export function compareMessageIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Whether `id` is later than `than` (anything is later than nothing). */
export const isLaterId = (id: string, than: string | null) => than === null || compareMessageIds(id, than) > 0;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** What a conversation is called: the group's title, or the other person's name. */
export const threadName = (thread: ChatThread, groupFallback: string): string =>
  thread.title ?? thread.other?.name ?? groupFallback;

/**
 * Its photo: the other person's. The API has no picture for a group, so a group
 * shows its initials (an open question for the backend).
 */
export const threadAvatar = (thread: ChatThread): string | null => thread.other?.avatarUrl ?? null;

/** Whether the last message in the list was yours. */
export function lastIsMine(thread: ChatThread, myId: string | null): boolean {
  const last = thread.lastMessage;
  if (!last) return false;
  if (myId) return last.senderId === myId;
  // Before your id is known, a direct chat still tells: it wasn't the other person.
  return thread.kind === 'direct' && !!thread.other && last.senderId !== thread.other.id;
}

/**
 * The line under a conversation's name: "You: I'll send the photos tonight."
 * for your own last message, "Chioma: See you at the meeting point!" in a
 * group, and the text alone in a one-to-one chat. A picture with no words reads
 * "Photo" or "3 photos".
 *
 * The API gives a group's last sender as an id only. `senderName` finds the
 * name among the members when that conversation has been opened (its detail is
 * cached); otherwise the preview shows without a name.
 */
export function previewLine(
  thread: ChatThread,
  options: {
    myId: string | null;
    senderName?: (userId: string) => string | null;
    you: string;
    photos: (count: number) => string;
  },
): string {
  const last = thread.lastMessage;
  if (!last) return '';
  const text = last.preview ?? (last.imageCount > 0 ? options.photos(last.imageCount) : '');
  if (!text) return '';
  if (lastIsMine(thread, options.myId)) return `${options.you}: ${text}`;
  if (thread.kind === 'group') {
    const full = options.senderName?.(last.senderId);
    if (!full) return text;
    const name = firstName(full);
    // "Kofi shared a new spot to try." already says who: no "Kofi: " in front.
    return text.startsWith(name) ? text : `${name}: ${text}`;
  }
  return text;
}

/** Under the header: "Online" for a person, "8 members · 3 online" for a group. */
export function presence(
  thread: ChatThreadDetail,
): { members: number; online: number } | { online: boolean } | null {
  if (thread.kind === 'group') return { members: thread.memberCount, online: thread.onlineCount };
  const other = thread.other;
  if (!other) return null;
  return { online: thread.members.find((m) => m.person.id === other.id)?.online ?? false };
}

/**
 * "Sent" or "Read" under your own message, from how far the others have read
 * (`lastReadMessageId`). People who hide read receipts send null and are left
 * out. One to one, it is Read once they have read it; in a group, once everyone
 * who shows receipts has, and at least one person does.
 */
export function messageStatus(message: ChatMessage, members: readonly ChatMember[]): 'sent' | 'read' {
  if (message.pending) return 'sent';
  const marks = members
    .filter((m) => m.person.id !== message.sender.id)
    .map((m) => m.lastReadMessageId)
    .filter((id): id is string => id !== null);
  if (marks.length === 0) return 'sent';
  return marks.every((id) => compareMessageIds(id, message.id) >= 0) ? 'read' : 'sent';
}

/** Members with one person's read mark moved forward (a read mark never goes back). */
export function withReadMark(members: readonly ChatMember[], userId: string, messageId: string): ChatMember[] {
  return members.map((m) =>
    m.person.id === userId && isLaterId(messageId, m.lastReadMessageId)
      ? { ...m, lastReadMessageId: messageId }
      : m,
  );
}

/**
 * Adds a message to a newest-first list, or replaces the copy already there.
 * Matching on `clientMsgId` as well as `id` is what turns the dimmed "Sending…"
 * bubble into the confirmed one, and what stops a message that arrives both as
 * the send's answer and over the socket from showing twice.
 */
export function upsertNewest(items: readonly ChatMessage[], message: ChatMessage): ChatMessage[] {
  const at = items.findIndex((m) => m.id === message.id || m.clientMsgId === message.clientMsgId);
  if (at === -1) return [message, ...items];
  return items.map((m, i) => (i === at ? message : m));
}

/** The newest message the server has confirmed, in a newest-first list. */
export const newestConfirmed = (items: readonly ChatMessage[]): ChatMessage | null =>
  items.find((m) => !m.pending) ?? null;

/** Why a message can't be sent as it is, or null. */
export function draftProblem(body: string, imageCount: number): 'invalid' | null {
  const text = body.trim();
  if (!text && imageCount === 0) return 'invalid';
  if (text.length > MESSAGE_MAX || imageCount > IMAGES_MAX) return 'invalid';
  return null;
}

/** The calendar day of a moment in the phone's time zone, as a sortable key. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type ConversationItem =
  | { kind: 'day'; key: string; day: string }
  | { kind: 'post'; key: 'post' }
  | { kind: 'message'; key: string; message: ChatMessage; showSender: boolean };

/**
 * What the conversation draws, oldest first: a day divider before each day, the
 * activity card under the first divider (as the design places it), then the
 * messages. In a group, a sender's name shows above the first of their run of
 * messages, never above your own.
 *
 * A message is keyed by its `clientMsgId` where it has one, so the bubble keeps
 * its place (and does not animate in again) when the server's copy replaces
 * the one being sent.
 */
export function conversationItems(
  oldestFirst: readonly ChatMessage[],
  options: { group: boolean; hasPost: boolean },
): ConversationItem[] {
  const items: ConversationItem[] = [];
  let lastDay: string | null = null;
  let lastSender: string | null = null;
  let postPlaced = !options.hasPost;
  for (const message of oldestFirst) {
    const day = dayKey(message.sentAt);
    if (day !== lastDay) {
      items.push({ kind: 'day', key: `day-${day}`, day: message.sentAt });
      lastDay = day;
      lastSender = null;
      if (!postPlaced) {
        items.push({ kind: 'post', key: 'post' });
        postPlaced = true;
      }
    }
    const showSender = options.group && !message.mine && message.sender.id !== lastSender;
    items.push({ kind: 'message', key: `m-${message.clientMsgId || message.id}`, message, showSender });
    lastSender = message.sender.id;
  }
  if (!postPlaced) items.unshift({ kind: 'post', key: 'post' });
  return items;
}
