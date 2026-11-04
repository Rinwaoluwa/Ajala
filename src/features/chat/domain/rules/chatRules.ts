import type { ChatMessage, ChatThread } from '../entities/Chat';

/** Longest message the composer sends. */
export const MESSAGE_MAX = 2000;
export const THREADS_PAGE = 20;
export const MESSAGES_PAGE = 30;

/**
 * The line under a conversation's name: "You: I'll send the photos tonight."
 * for your own last message, "Chioma: See you at the meeting point!" in a group,
 * and the text alone in a one-to-one chat.
 */
export function previewLine(thread: ChatThread, youLabel = 'You'): string {
  const last = thread.lastMessage;
  if (!last) return '';
  if (last.fromMe) return `${youLabel}: ${last.text}`;
  if (thread.kind === 'group') {
    const name = firstName(last.senderName);
    // "Kofi shared a new spot to try." already says who: no "Kofi: " in front.
    return last.text.startsWith(name) ? last.text : `${name}: ${last.text}`;
  }
  return last.text;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Under the header: "Online" for a person, "8 members · 3 online" for a group. */
export function presence(
  thread: ChatThread,
): { members: number; online: number } | { online: boolean } | null {
  if (thread.kind === 'group') {
    return thread.memberCount === null
      ? null
      : { members: thread.memberCount, online: thread.onlineCount ?? 0 };
  }
  return thread.other ? { online: thread.other.online } : null;
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
    const showSender = options.group && !message.fromMe && message.sender.id !== lastSender;
    items.push({ kind: 'message', key: message.id, message, showSender });
    lastSender = message.sender.id;
  }
  if (!postPlaced) items.unshift({ kind: 'post', key: 'post' });
  return items;
}
