import type { ChatErrorCode } from '../domain/entities/ChatError';

/** Messages' words, from the Figma frames (Messages, Chat 1:1, Chat group, Safety tips). */
export const chatCopy = {
  title: 'Messages',
  back: 'Back',
  compose: 'New message',
  search: 'Search messages',
  filters: [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'groups', label: 'Groups' },
  ] as const,
  you: 'You',
  unread: (n: number) => `${n} unread`,
  empty: {
    title: 'No messages yet',
    body: 'Your conversations will appear here once you start chatting with someone.',
    action: 'Explore plans',
  },
  noResults: {
    title: 'No conversations found',
    body: (q: string) => `We couldn’t find a conversation for “${q}”. Try another name or group.`,
    action: 'Clear search',
  },
  noUnread: { title: 'You’re all caught up', body: 'Unread conversations will show here.' },
  noGroups: { title: 'No group chats yet', body: 'Join a group activity to chat with everyone going.' },
  loadFailed: 'Couldn’t load your messages.',
  retry: 'Try again',
  loading: 'Loading messages',
  composeSheet: {
    title: 'Start a conversation',
    body: 'Starting a new chat is coming soon. Until then, your conversations, and the group chats for activities you join, show up here.',
    action: 'Got it',
  },
  thread: {
    online: 'Online',
    group: (members: number, online: number) => `${members} members · ${online} online`,
    today: 'Today',
    yesterday: 'Yesterday',
    sent: 'Sent',
    read: 'Read',
    sending: 'Sending…',
    placeholder: 'Message...',
    send: 'Send message',
    safety: 'Safety tips',
    empty: {
      title: 'Say hello',
      body: 'Messages you send here are only seen by people in this conversation.',
    },
    loadFailed: 'Couldn’t load this conversation.',
    openPost: (title: string) => `Open ${title}`,
  },
  banner: {
    title: 'Keep chats on Ajala',
    link: 'Click here for safety tips',
    close: 'Hide this reminder',
  },
  tips: {
    title: 'Safety tips',
    body: 'Stay safe while chatting and making plans.',
    items: [
      {
        title: 'Keep chats on Ajala',
        body: 'Get to know someone here before sharing other contact details.',
      },
      {
        title: 'Protect your personal details',
        body: 'Keep your address, passwords, and verification codes private.',
      },
      {
        title: 'Be cautious with money',
        body: 'Never send money or payment details to someone you haven’t verified.',
      },
      {
        title: 'Meet in a public place',
        body: 'Tell someone you trust your plans and arrange your own transport.',
      },
      {
        title: 'Trust your instincts',
        body: 'You can leave any chat. Block or report anyone who makes you feel unsafe.',
      },
    ],
    action: 'Got it',
  },
};

export const chatErrorMessages: Record<ChatErrorCode, string> = {
  unavailable: 'Chat is coming soon — your message is kept here.',
  invalid: 'Write something first (up to 2,000 characters).',
  notAllowed: 'You can’t send messages in this conversation.',
  rateLimited: 'You’re sending messages quickly. Wait a moment and try again.',
  network: 'You seem to be offline. Check your connection and try again.',
  sessionExpired: 'Your session ended. Sign in again to continue.',
  unknown: 'Something went wrong. Try again.',
};
